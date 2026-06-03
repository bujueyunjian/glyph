mod agent;
mod commands;
mod lsp;
mod proc;
mod watch;

use agent::{agent_oneshot, agent_stream};
use commands::app::get_app_info;
use commands::file::{
    create_dir, create_file, delete_path, list_dir, list_files, open_file, rename_path, save_file,
};
use commands::search::search_files;
use lsp::{lsp_request, lsp_send, lsp_start, lsp_stop, LspRegistry};
use proc::{proc_kill, proc_spawn, proc_write, ProcRegistry};
use watch::{unwatch_workspace, watch_workspace, WatchState};

// 应用装配入口。插件 + state + command 注册都在这里;命令实现在 commands/* 与 proc.rs。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ProcRegistry::default())
        .manage(WatchState::default())
        .manage(LspRegistry::default())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            open_file,
            save_file,
            list_dir,
            list_files,
            create_file,
            create_dir,
            rename_path,
            delete_path,
            search_files,
            proc_spawn,
            proc_write,
            proc_kill,
            watch_workspace,
            unwatch_workspace,
            agent_oneshot,
            agent_stream,
            lsp_start,
            lsp_send,
            lsp_request,
            lsp_stop
        ])
        .run(tauri::generate_context!())
        .expect("Glyph 启动失败");
}
