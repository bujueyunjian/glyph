use std::path::Path;
use std::sync::Mutex;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, State};

// 工作区文件监听:notify 监听根目录,任何变化经事件 `fs://changed` 推送 UI(前端防抖刷新)。
// Watcher 必须保活(drop 即停),存于 State;watch_workspace 替换旧的。

#[derive(Default)]
pub struct WatchState(Mutex<Option<RecommendedWatcher>>);

#[tauri::command]
pub fn watch_workspace(
    app: AppHandle,
    state: State<'_, WatchState>,
    path: String,
) -> Result<(), String> {
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if res.is_ok() {
            let _ = app.emit("fs://changed", ());
        }
    })
    .map_err(|e| format!("创建文件监听失败: {e}"))?;
    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| format!("监听目录失败 ({path}): {e}"))?;
    *state.0.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn unwatch_workspace(state: State<'_, WatchState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}
