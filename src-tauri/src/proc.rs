use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// 支柱③(Agent 宿主)的最小地基:spawn 本地子进程 + 双向 stdio + 逐行推送到 UI。
// 这是 ACP/MCP 本地宿主的底座(ADR-0004);本增量只打通最小闭环,不实现完整协议。

// 受管子进程:持有句柄(用于终止)与 stdin(用于写入)。
struct ManagedChild {
    child: Child,
    stdin: ChildStdin,
}

// 子进程注册表,挂到 Tauri State,按 id 管理多个子进程。
#[derive(Default)]
pub struct ProcRegistry {
    next_id: Mutex<u32>,
    children: Mutex<HashMap<u32, ManagedChild>>,
}

// stdout 流式行事件载荷;serde camelCase 对齐前端。
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcLine {
    id: u32,
    line: String,
}

// 构造子进程命令:三管道接管 + Windows 不弹黑色控制台。
// 与 cargo 单测共用,确保 spawn/stdio 行为被真实验证(见文件末 tests)。
fn build_command(program: &str, args: &[String]) -> Command {
    let mut cmd = Command::new(program);
    cmd.args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

// spawn 本地子进程;后台线程逐行读 stdout,经事件 `proc://stdout` 推到 UI,
// 进程结束发 `proc://closed`。返回子进程 id 供后续写入/终止。
#[tauri::command]
pub fn proc_spawn(
    app: AppHandle,
    registry: State<'_, ProcRegistry>,
    program: String,
    args: Vec<String>,
) -> Result<u32, String> {
    let mut child = build_command(&program, &args)
        .spawn()
        .map_err(|e| format!("启动子进程失败 ({program}): {e}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取子进程 stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取子进程 stdout".to_string())?;

    let id = {
        let mut next = registry.next_id.lock().unwrap();
        *next += 1;
        *next
    };

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let Ok(line) = line else { break };
            let _ = app.emit("proc://stdout", ProcLine { id, line });
        }
        let _ = app.emit("proc://closed", id);
    });

    registry
        .children
        .lock()
        .unwrap()
        .insert(id, ManagedChild { child, stdin });
    Ok(id)
}

// 向子进程 stdin 写入数据(如 ACP/MCP 的 JSON-RPC 行)。
#[tauri::command]
pub fn proc_write(registry: State<'_, ProcRegistry>, id: u32, data: String) -> Result<(), String> {
    let mut children = registry.children.lock().unwrap();
    let managed = children
        .get_mut(&id)
        .ok_or_else(|| format!("子进程 {id} 不存在"))?;
    managed
        .stdin
        .write_all(data.as_bytes())
        .map_err(|e| format!("写入子进程 {id} 失败: {e}"))?;
    managed
        .stdin
        .flush()
        .map_err(|e| format!("刷新子进程 {id} 失败: {e}"))
}

// 终止并移除子进程。
#[tauri::command]
pub fn proc_kill(registry: State<'_, ProcRegistry>, id: u32) -> Result<(), String> {
    let mut managed = registry
        .children
        .lock()
        .unwrap()
        .remove(&id)
        .ok_or_else(|| format!("子进程 {id} 不存在"))?;
    managed
        .child
        .kill()
        .map_err(|e| format!("终止子进程 {id} 失败: {e}"))
}

#[cfg(all(test, unix))]
mod tests {
    use super::build_command;
    use std::io::{BufRead, BufReader, Write};

    // 验证 spawn + 双向 stdio 闭环:cat 把 stdin 原样回显到 stdout。
    #[test]
    fn spawn_roundtrips_stdin_to_stdout() {
        let mut child = build_command("cat", &[]).spawn().expect("spawn cat");
        let mut stdin = child.stdin.take().expect("stdin");
        let stdout = child.stdout.take().expect("stdout");
        stdin.write_all(b"ping\n").expect("write");
        drop(stdin); // 关闭 stdin 让 cat 退出
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        reader.read_line(&mut line).expect("read");
        assert_eq!(line.trim_end(), "ping");
        child.wait().expect("wait");
    }
}
