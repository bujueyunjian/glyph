mod agent;
mod commands;
mod launch;
mod lsp;
mod proc;
mod watch;

use agent::{agent_cancel, agent_oneshot, agent_stream, AgentRegistry};
use commands::app::get_app_info;
use commands::file::{
    create_dir, create_file, delete_path, list_dir, list_files, open_file, rename_path, save_file,
};
use commands::search::search_files;
use launch::{take_launch_file, LaunchFile};
use lsp::{lsp_request, lsp_send, lsp_start, lsp_stop, LspRegistry};
use proc::{proc_kill, proc_spawn, proc_write, ProcRegistry};
use tauri::{Emitter, Manager, RunEvent};
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
        .manage(AgentRegistry::default())
        .manage(LaunchFile::from_args())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            take_launch_file,
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
            agent_cancel,
            lsp_start,
            lsp_send,
            lsp_request,
            lsp_stop
        ])
        .build(tauri::generate_context!())
        .expect("Glyph 启动失败")
        .run(|app_handle, event| {
            // macOS「用 Glyph 打开」/拖到 Dock:运行时 emit 通知前端打开,
            // 同时写入 LaunchFile 兜底冷启动(前端轮询时取走)。
            if let RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        let path = path.to_string_lossy().to_string();
                        *app_handle.state::<LaunchFile>().0.lock().unwrap() = Some(path.clone());
                        let _ = app_handle.emit("open-external-file", path);
                    }
                }
            }
        });
}
