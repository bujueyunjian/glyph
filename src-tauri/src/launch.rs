use std::path::Path;
use std::sync::Mutex;

use tauri::State;

// 启动时待打开的文件(经"用 Glyph 打开"/命令行参数传入)。
// Win/Linux 冷启动经 argv;macOS 经 RunEvent::Opened(见 lib.rs)写入兜底,
// 应对前端监听就绪前事件已抵达的竞态。前端挂载后用 take_launch_file 取走。
#[derive(Default)]
pub struct LaunchFile(pub Mutex<Option<String>>);

impl LaunchFile {
    pub fn from_args() -> Self {
        LaunchFile(Mutex::new(launch_file_from_args()))
    }
}

// 从命令行参数提取要打开的文件:跳过程序名与选项,取首个真实存在的文件路径。
pub fn launch_file_from_args() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|arg| !arg.starts_with('-') && Path::new(arg).is_file())
}

// 取出并清除启动待打开文件(前端挂载后调用一次)。
#[tauri::command]
pub fn take_launch_file(state: State<'_, LaunchFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg(test)]
mod tests {
    use super::LaunchFile;

    #[test]
    fn take_clears_after_first_read() {
        let lf = LaunchFile(std::sync::Mutex::new(Some("/tmp/x.rs".into())));
        assert_eq!(lf.0.lock().unwrap().take().as_deref(), Some("/tmp/x.rs"));
        assert_eq!(lf.0.lock().unwrap().take(), None);
    }
}
