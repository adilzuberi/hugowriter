//! Round-trip tests for `commands::config::{write_config, touch_sentinel, build_source_map}`.
//! Mirrors the multi-file fixture at `desktop/tests/fixtures/site/`. Each test
//! works in a `tempfile::TempDir` copy of the fixture so the on-disk fixture
//! is never mutated.

use std::fs;
use std::path::{Path, PathBuf};

use hugowriter_desktop_lib::commands::config::{
    build_source_map_for_test, touch_sentinel, write_config,
};
use serde_json::json;

fn fixture_root() -> PathBuf {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.pop(); // desktop/
    p.push("tests/fixtures/site");
    p
}

fn copy_fixture_to(tmp: &Path) {
    let src = fixture_root();
    copy_dir(&src, tmp).expect("copy fixture");
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let target = dst.join(entry.file_name());
        if path.is_dir() {
            copy_dir(&path, &target)?;
        } else {
            fs::copy(&path, &target)?;
        }
    }
    Ok(())
}

#[test]
fn write_preserves_comments_and_unrelated_keys() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());
    let hugo_toml = tmp.path().join("config/_default/hugo.toml");
    let before = fs::read_to_string(&hugo_toml).unwrap();
    assert!(before.contains("# Fixture site config"));
    assert!(before.contains("enableRobotsTXT = true"));

    write_config(&hugo_toml, "title", &json!("Fixture site edited")).unwrap();

    let after = fs::read_to_string(&hugo_toml).unwrap();
    assert!(after.contains("title = \"Fixture site edited\""));
    assert!(after.contains("# Fixture site config"), "leading comment dropped");
    assert!(after.contains("enableRobotsTXT = true"), "unrelated key dropped");
}

#[test]
fn write_adds_missing_key_under_parent_table() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());
    let params_toml = tmp.path().join("config/_default/params.toml");

    write_config(&params_toml, "theme.newField", &json!("newvalue")).unwrap();

    let after = fs::read_to_string(&params_toml).unwrap();
    assert!(after.contains("newField"));
    assert!(after.contains("newvalue"));
}

#[test]
fn write_creates_parent_table_when_missing() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());
    let hugo_toml = tmp.path().join("config/_default/hugo.toml");

    write_config(&hugo_toml, "extra.nested.key", &json!(42)).unwrap();

    let after = fs::read_to_string(&hugo_toml).unwrap();
    assert!(after.contains("key = 42") || after.contains("key=42"));
}

#[test]
fn source_map_attributes_keys_to_their_file() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());

    let sources = build_source_map_for_test(tmp.path()).unwrap();
    let title_src = sources.get("title").expect("title source missing");
    assert!(title_src.ends_with("config/_default/hugo.toml"));
    let theme_src = sources.get("theme.preset").expect("theme.preset source missing");
    assert!(theme_src.ends_with("config/_default/params.toml"));
}

#[test]
fn touch_sentinel_creates_or_refreshes_marker_file() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());
    let sentinel = tmp.path().join(".hugowriter-sentinel");
    assert!(!sentinel.exists());

    touch_sentinel(tmp.path()).unwrap();

    assert!(sentinel.exists());
    let first = fs::read_to_string(&sentinel).unwrap();

    // Sleep one ms then touch again to verify the timestamp changes.
    std::thread::sleep(std::time::Duration::from_millis(2));
    touch_sentinel(tmp.path()).unwrap();
    let second = fs::read_to_string(&sentinel).unwrap();
    assert_ne!(first, second);
}

#[test]
fn atomic_write_via_tmp_file_then_rename() {
    let tmp = tempfile::tempdir().unwrap();
    copy_fixture_to(tmp.path());
    let hugo_toml = tmp.path().join("config/_default/hugo.toml");

    write_config(&hugo_toml, "title", &json!("atomic")).unwrap();

    // After a successful write, no lingering .tmp file should remain.
    let tmp_path = hugo_toml.with_extension("toml.tmp");
    assert!(!tmp_path.exists(), ".tmp file lingered after rename");
    let content = fs::read_to_string(&hugo_toml).unwrap();
    assert!(content.contains("title = \"atomic\""));
}
