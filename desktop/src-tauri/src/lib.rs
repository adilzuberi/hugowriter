pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            commands::config::config_load,
            commands::config::config_write,
            commands::config::config_touch_sentinel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hugowriter desktop application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn crate_compiles() {
        assert_eq!(2 + 2, 4);
    }
}
