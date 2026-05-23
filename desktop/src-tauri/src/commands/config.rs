use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use serde_json::Value as JsonValue;
use toml_edit::{value, Array, DocumentMut, Item, Table, Value};

#[derive(Debug, Serialize, Clone)]
pub struct ThemeSettings {
    pub preset: String,
    #[serde(rename = "basePx")]
    pub base_px: f64,
    pub accent: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct EffectiveConfig {
    pub title: String,
    pub description: String,
    #[serde(rename = "languageCode")]
    pub language_code: String,
    #[serde(rename = "baseURL")]
    pub base_url: String,
    pub params: EffectiveParams,
}

#[derive(Debug, Serialize, Clone)]
pub struct EffectiveParams {
    pub theme: ThemeSettings,
}

#[derive(Debug, Serialize, Clone)]
pub struct ConfigLoadResult {
    pub effective: EffectiveConfig,
    pub sources: HashMap<String, PathBuf>,
}

/// Walk the site's TOML config files and merge their source-of-truth map.
/// `hugo config --format json` provides the merged-view oracle; `toml_edit`
/// inspects each config file individually to attribute keys to their file.
pub fn load_config(site_root: &Path) -> Result<ConfigLoadResult, String> {
    let json = run_hugo_config(site_root)?;
    let effective = parse_effective(&json)?;
    let sources = build_source_map(site_root)?;
    Ok(ConfigLoadResult { effective, sources })
}

fn run_hugo_config(site_root: &Path) -> Result<JsonValue, String> {
    let output = Command::new("hugo")
        .args([
            "config",
            "--source",
            &site_root.display().to_string(),
            "--format",
            "json",
        ])
        .output()
        .map_err(|e| format!("hugo invocation failed: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("hugo config exited {}: {}", output.status, stderr));
    }
    serde_json::from_slice::<JsonValue>(&output.stdout)
        .map_err(|e| format!("hugo config returned invalid JSON: {e}"))
}

fn parse_effective(json: &JsonValue) -> Result<EffectiveConfig, String> {
    let obj = json.as_object().ok_or("expected top-level object")?;
    let get_str = |key: &str| {
        obj.get(key)
            .and_then(JsonValue::as_str)
            .unwrap_or("")
            .to_string()
    };
    let params = obj
        .get("params")
        .and_then(JsonValue::as_object)
        .cloned()
        .unwrap_or_default();
    let theme = params
        .get("theme")
        .and_then(JsonValue::as_object)
        .cloned()
        .unwrap_or_default();
    Ok(EffectiveConfig {
        title: get_str("title"),
        description: params
            .get("description")
            .and_then(JsonValue::as_str)
            .unwrap_or("")
            .to_string(),
        language_code: get_str("languagecode"),
        base_url: get_str("baseurl"),
        params: EffectiveParams {
            theme: ThemeSettings {
                preset: theme
                    .get("preset")
                    .and_then(JsonValue::as_str)
                    .unwrap_or("focus-stock")
                    .to_string(),
                base_px: theme
                    .get("basePx")
                    .or_else(|| theme.get("basepx"))
                    .and_then(JsonValue::as_f64)
                    .unwrap_or(18.0),
                accent: theme
                    .get("accent")
                    .and_then(JsonValue::as_str)
                    .unwrap_or("#1a5fb4")
                    .to_string(),
            },
        },
    })
}

pub fn build_source_map_for_test(site_root: &Path) -> Result<HashMap<String, PathBuf>, String> {
    build_source_map(site_root)
}

fn build_source_map(site_root: &Path) -> Result<HashMap<String, PathBuf>, String> {
    let mut sources = HashMap::new();
    let candidates = [
        site_root.join("hugo.toml"),
        site_root.join("config.toml"),
        site_root.join("config/_default/hugo.toml"),
        site_root.join("config/_default/config.toml"),
        site_root.join("config/_default/params.toml"),
    ];
    for path in candidates.iter() {
        if !path.exists() {
            continue;
        }
        let raw = std::fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let doc: DocumentMut = raw
            .parse::<DocumentMut>()
            .map_err(|e| format!("failed to parse {}: {e}", path.display()))?;
        walk_table(doc.as_table(), &mut sources, path, "");
    }
    Ok(sources)
}

fn walk_table(table: &Table, sources: &mut HashMap<String, PathBuf>, path: &Path, prefix: &str) {
    for (key, item) in table.iter() {
        let dotted = if prefix.is_empty() {
            key.to_string()
        } else {
            format!("{prefix}.{key}")
        };
        match item {
            Item::Table(t) => walk_table(t, sources, path, &dotted),
            Item::Value(_) | Item::ArrayOfTables(_) | Item::None => {
                sources.insert(dotted, path.to_path_buf());
            }
        }
    }
}

/// Open a TOML file with `toml_edit`, set the dotted key path to the given JSON
/// value, and write back atomically (tmp file + rename). Creates parent tables
/// when they are missing.
pub fn write_config(
    file: &Path,
    key_path: &str,
    json_value: &JsonValue,
) -> Result<(), String> {
    let raw = std::fs::read_to_string(file)
        .map_err(|e| format!("failed to read {}: {e}", file.display()))?;
    let mut doc: DocumentMut = raw
        .parse::<DocumentMut>()
        .map_err(|e| format!("failed to parse {}: {e}", file.display()))?;
    set_value(&mut doc, key_path, json_value)?;
    let tmp = file.with_extension("toml.tmp");
    std::fs::write(&tmp, doc.to_string())
        .map_err(|e| format!("failed to write tmp file: {e}"))?;
    std::fs::rename(&tmp, file)
        .map_err(|e| format!("atomic rename failed: {e}"))?;
    Ok(())
}

fn set_value(doc: &mut DocumentMut, key_path: &str, json: &JsonValue) -> Result<(), String> {
    let parts: Vec<&str> = key_path.split('.').collect();
    let last = *parts.last().ok_or("empty key path")?;
    let mut node: &mut Table = doc.as_table_mut();
    for part in parts.iter().take(parts.len() - 1) {
        if !node.contains_key(part) {
            node[*part] = Item::Table(Table::new());
        }
        let inner = node.get_mut(*part).and_then(|i| i.as_table_mut());
        node = inner.ok_or_else(|| format!("{part} is not a table"))?;
    }
    node[last] = value(json_to_toml(json));
    Ok(())
}

fn json_to_toml(json: &JsonValue) -> Value {
    match json {
        JsonValue::String(s) => Value::from(s.as_str()),
        JsonValue::Bool(b) => Value::from(*b),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::from(i)
            } else if let Some(f) = n.as_f64() {
                Value::from(f)
            } else {
                Value::from(n.to_string())
            }
        }
        JsonValue::Array(arr) => {
            let mut a = Array::new();
            for item in arr {
                a.push(json_to_toml(item));
            }
            Value::Array(a)
        }
        JsonValue::Null | JsonValue::Object(_) => Value::from(json.to_string()),
    }
}

/// Touch `<site_root>/.hugowriter-sentinel`. The Mode 2 Hugo sidecar from PR 5
/// will pick this up the next time the watcher fires.
pub fn touch_sentinel(site_root: &Path) -> Result<(), String> {
    let sentinel = site_root.join(".hugowriter-sentinel");
    let now = format!("{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());
    std::fs::write(&sentinel, now).map_err(|e| format!("sentinel write failed: {e}"))
}

#[tauri::command]
pub fn config_load(site_root: PathBuf) -> Result<ConfigLoadResult, String> {
    load_config(&site_root)
}

#[tauri::command]
pub fn config_write(file: PathBuf, key_path: String, value: JsonValue) -> Result<(), String> {
    write_config(&file, &key_path, &value)
}

#[tauri::command]
pub fn config_touch_sentinel(site_root: PathBuf) -> Result<(), String> {
    touch_sentinel(&site_root)
}
