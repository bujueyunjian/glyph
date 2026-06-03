mod commands;
mod proc;

use commands::app::get_app_info;
use commands::file::{list_dir, list_files, open_file, save_file};
use proc::{proc_kill, proc_spawn, proc_write, ProcRegistry};

// 应用装配入口。插件 + state + command 注册都在这里;命令实现在 commands/* 与 proc.rs。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ProcRegistry::default())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            open_file,
            save_file,
            list_dir,
            list_files,
            proc_spawn,
            proc_write,
            proc_kill
        ])
        .run(tauri::generate_context!())
        .expect("Glyph 启动失败");
}
