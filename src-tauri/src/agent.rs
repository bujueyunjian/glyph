use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// 进行中的流式会话:turn_id(前端分配)→ 子进程句柄,供取消/回收。
type ChildMap = Arc<Mutex<HashMap<u64, Child>>>;

#[derive(Default)]
pub struct AgentRegistry {
    children: ChildMap,
}

// ACP(Agent Client Protocol)最小客户端:JSON-RPC 2.0 over ndjson stdio。
// v1 走轻量自研(仅 serde_json,无 tokio——贴合「轻」SLO,复用 std 子进程模型),
// 一次性 prompt 取完整文本。完整流式/会话保活/fs/terminal/权限留后续(见 ADR-0008)。

fn rpc_request(id: u64, method: &str, params: Value) -> String {
    json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params }).to_string()
}

// 安全边界:对 agent → client 的请求(fs/terminal/permission 等)一律回错误。
// Glyph 绝不借自身权限让第三方 agent 触达文件系统/终端——数据安全高于功能(见 ADR-0009)。
fn deny_reply(req_id: u64) -> String {
    json!({
        "jsonrpc": "2.0",
        "id": req_id,
        "error": { "code": -32601, "message": "Glyph does not grant fs/terminal access to agents" }
    })
    .to_string()
}

fn client_init_params() -> Value {
    json!({
        "protocolVersion": 1,
        "clientCapabilities": { "fs": { "readTextFile": false, "writeTextFile": false }, "terminal": false },
        "clientInfo": { "name": "glyph", "version": env!("CARGO_PKG_VERSION") }
    })
}

// 从 session/update 通知抽取 agent 文本块(防御式:形状不符返回 None)。
fn extract_agent_text(message: &Value) -> Option<String> {
    let update = message.get("params")?.get("update")?;
    if update.get("sessionUpdate")?.as_str()? != "agent_message_chunk" {
        return None;
    }
    update
        .get("content")?
        .get("text")?
        .as_str()
        .map(str::to_string)
}

// 该消息若是「对 id 的响应」则返回 Ok(result)/Err(error);否则 None。
fn response_for(message: &Value, id: u64) -> Option<Result<Value, String>> {
    if message.get("id").and_then(Value::as_u64) != Some(id) {
        return None;
    }
    if let Some(err) = message.get("error") {
        return Some(Err(err.to_string()));
    }
    Some(Ok(message.get("result").cloned().unwrap_or(Value::Null)))
}

// 解析 agent 工作目录:优先用调用方传入的工作区根(收敛 agent 默认作用域到用户打开的工程),
// 缺省才回退到进程当前目录。安全考量见 ADR-0009:不让 agent 默认拿到过宽的启动目录(如打包 app 的 `/`)。
fn resolve_cwd(cwd: Option<String>) -> String {
    match cwd {
        Some(p) if !p.trim().is_empty() => p,
        _ => std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
    }
}

// session/new 参数:cwd(作用域)+ mcpServers(转发用户配置的 MCP server,由 agent 连接,见 ADR-0010)。
// Glyph 不解析 MCP 协议,只把配置原样转发;非数组的 mcpServers 归一为空数组。
fn session_new_params(cwd: &str, mcp_servers: &Value) -> Value {
    let servers = if mcp_servers.is_array() {
        mcp_servers.clone()
    } else {
        json!([])
    };
    json!({ "cwd": cwd, "mcpServers": servers })
}

fn write_line(stdin: &mut ChildStdin, line: &str) -> Result<(), String> {
    stdin
        .write_all(line.as_bytes())
        .and_then(|()| stdin.write_all(b"\n"))
        .and_then(|()| stdin.flush())
        .map_err(|e| format!("写入 agent 失败: {e}"))
}

// 读 ndjson 行直到拿到 id 的响应;途中累积 agent 文本,对 agent 发来的请求回错误避免挂起。
fn pump_until<R: BufRead>(
    reader: &mut R,
    stdin: &mut ChildStdin,
    target_id: u64,
    answer: &mut String,
) -> Result<Value, String> {
    let mut line = String::new();
    loop {
        line.clear();
        let n = reader
            .read_line(&mut line)
            .map_err(|e| format!("读取 agent 失败: {e}"))?;
        if n == 0 {
            return Err("agent 在响应前结束了".to_string());
        }
        let Ok(message) = serde_json::from_str::<Value>(line.trim()) else {
            continue; // 跳过非 JSON 行(如 agent 日志)
        };
        if let Some(result) = response_for(&message, target_id) {
            return result;
        }
        if let Some(text) = extract_agent_text(&message) {
            answer.push_str(&text);
        } else if message.get("method").is_some() {
            // agent → client 请求(fs/terminal/permission 等),v1 不支持 → 回错误避免挂起。
            if let Some(req_id) = message.get("id").and_then(Value::as_u64) {
                write_line(stdin, &deny_reply(req_id))?;
            }
        }
    }
}

fn agent_turn<R: BufRead>(
    reader: &mut R,
    stdin: &mut ChildStdin,
    prompt: &str,
    cwd: &str,
    mcp_servers: &Value,
    answer: &mut String,
) -> Result<(), String> {
    write_line(stdin, &rpc_request(0, "initialize", client_init_params()))?;
    pump_until(reader, stdin, 0, answer)?;

    write_line(
        stdin,
        &rpc_request(1, "session/new", session_new_params(cwd, mcp_servers)),
    )?;
    let session = pump_until(reader, stdin, 1, answer)?;
    let session_id = session
        .get("sessionId")
        .and_then(Value::as_str)
        .ok_or_else(|| "session/new 未返回 sessionId".to_string())?;

    write_line(
        stdin,
        &rpc_request(
            2,
            "session/prompt",
            json!({ "sessionId": session_id, "prompt": [{ "type": "text", "text": prompt }] }),
        ),
    )?;
    pump_until(reader, stdin, 2, answer)?;
    Ok(())
}

fn kill(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(windows)]
fn has_windows_command_extension(program: &str) -> bool {
    let lower = program.to_ascii_lowercase();
    lower.ends_with(".exe")
        || lower.ends_with(".cmd")
        || lower.ends_with(".bat")
        || lower.ends_with(".com")
}

// Windows 的 npm 全局 bin 通常是 .cmd shim;std::process::Command 不会像 shell 一样解析 PATHEXT。
#[cfg(windows)]
fn spawn_program_candidates(program: &str) -> Vec<String> {
    if has_windows_command_extension(program) {
        return vec![program.to_string()];
    }
    vec![program.to_string(), format!("{program}.cmd")]
}

#[cfg(not(windows))]
fn spawn_program_candidates(program: &str) -> Vec<String> {
    vec![program.to_string()]
}

// 按用户配置的命令启动 ACP agent 子进程(stdio 全管道)。命令按空白拆 program + args,
// 故 "claude-code-acp" 与 "npx -y @zed-industries/claude-code-acp" 都支持。
// 命令不存在(ENOENT)时给可执行的指引:Glyph 不内置 agent,需自备适配器。
fn spawn_agent(agent_cmd: &str) -> Result<Child, String> {
    let mut parts = agent_cmd.split_whitespace();
    let program = parts
        .next()
        .ok_or_else(|| "agent 命令为空".to_string())?
        .to_string();
    let args: Vec<String> = parts.map(str::to_string).collect();

    for candidate in spawn_program_candidates(&program) {
        let mut command = Command::new(&candidate);
        command
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        match command.spawn() {
            Ok(child) => return Ok(child),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => return Err(format!("启动 agent 失败 ({program}): {e}")),
        }
    }

    Err(format!(
        "未找到 agent 命令「{program}」。Glyph 不内置 AI agent,需自备 ACP 适配器:\
         例如 npm i -g @zed-industries/claude-code-acp(它提供 claude-code-acp 命令),\
         装好后重启 Glyph 并在 AI 面板填入该命令。"
    ))
}

// 一次性向 ACP agent 发 prompt 取完整文本响应。agent_cmd 如 "claude-code-acp"(用户已装的适配器)。
#[tauri::command]
pub fn agent_oneshot(
    agent_cmd: String,
    prompt: String,
    cwd: Option<String>,
    mcp_servers: Option<Value>,
) -> Result<String, String> {
    let cwd = resolve_cwd(cwd);
    let mcp_servers = mcp_servers.unwrap_or_else(|| json!([]));
    let mut child = spawn_agent(&agent_cmd)?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取 agent stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取 agent stdout".to_string())?;
    let mut reader = BufReader::new(stdout);
    let mut answer = String::new();

    let outcome = agent_turn(
        &mut reader,
        &mut stdin,
        &prompt,
        &cwd,
        &mcp_servers,
        &mut answer,
    );
    kill(&mut child);
    outcome.map(|()| answer)
}

// 读 ndjson 直到 id 响应,途中把 agent 文本块经事件 `agent://chunk` 推送(带 turn_id)。
fn pump_emit<R: BufRead>(
    app: &AppHandle,
    reader: &mut R,
    stdin: &mut ChildStdin,
    target_id: u64,
    turn_id: u64,
) -> Result<(), String> {
    let mut line = String::new();
    loop {
        line.clear();
        let n = reader
            .read_line(&mut line)
            .map_err(|e| format!("读取 agent 失败: {e}"))?;
        if n == 0 {
            return Err("agent 在响应前结束了".to_string());
        }
        let Ok(message) = serde_json::from_str::<Value>(line.trim()) else {
            continue;
        };
        if let Some(result) = response_for(&message, target_id) {
            return result.map(|_| ());
        }
        if let Some(text) = extract_agent_text(&message) {
            // 事件带 turn_id:前端按当前会话过滤,杜绝旧会话残留 chunk 串入新会话。
            let _ = app.emit("agent://chunk", json!({ "turnId": turn_id, "text": text }));
        } else if message.get("method").is_some() {
            if let Some(req_id) = message.get("id").and_then(Value::as_u64) {
                write_line(stdin, &deny_reply(req_id))?;
            }
        }
    }
}

fn stream_turn<R: BufRead>(
    app: &AppHandle,
    reader: &mut R,
    stdin: &mut ChildStdin,
    prompt: &str,
    cwd: &str,
    mcp_servers: &Value,
    turn_id: u64,
) -> Result<(), String> {
    let mut scratch = String::new();
    write_line(stdin, &rpc_request(0, "initialize", client_init_params()))?;
    pump_until(reader, stdin, 0, &mut scratch)?;

    write_line(
        stdin,
        &rpc_request(1, "session/new", session_new_params(cwd, mcp_servers)),
    )?;
    let session = pump_until(reader, stdin, 1, &mut scratch)?;
    let session_id = session
        .get("sessionId")
        .and_then(Value::as_str)
        .ok_or_else(|| "session/new 未返回 sessionId".to_string())?;

    write_line(
        stdin,
        &rpc_request(
            2,
            "session/prompt",
            json!({ "sessionId": session_id, "prompt": [{ "type": "text", "text": prompt }] }),
        ),
    )?;
    pump_emit(app, reader, stdin, 2, turn_id)
}

fn run_stream(
    app: &AppHandle,
    children: &ChildMap,
    turn_id: u64,
    agent_cmd: &str,
    prompt: &str,
    cwd: &str,
    mcp_servers: &Value,
) -> Result<(), String> {
    let mut child = spawn_agent(agent_cmd)?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取 agent stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取 agent stdout".to_string())?;

    // 收集 stderr:既防管道写满阻塞,又让失败响亮(把 agent 自身报错并入错误)。
    let stderr_buf = Arc::new(Mutex::new(String::new()));
    if let Some(stderr) = child.stderr.take() {
        let buf = Arc::clone(&stderr_buf);
        std::thread::spawn(move || {
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).map(|n| n > 0).unwrap_or(false) {
                buf.lock().unwrap().push_str(&line);
                line.clear();
            }
        });
    }

    // 登记子进程供取消;turn 自然结束/出错后移除并回收(取消可能已先移除)。
    children.lock().unwrap().insert(turn_id, child);
    let mut reader = BufReader::new(stdout);
    let outcome = stream_turn(
        app,
        &mut reader,
        &mut stdin,
        prompt,
        cwd,
        mcp_servers,
        turn_id,
    );
    if let Some(mut child) = children.lock().unwrap().remove(&turn_id) {
        kill(&mut child);
    }

    outcome.map_err(|e| {
        let detail = stderr_buf.lock().unwrap();
        let trimmed = detail.trim();
        if trimmed.is_empty() {
            e
        } else {
            format!("{e}\n{trimmed}")
        }
    })
}

// 流式向 ACP agent 发 prompt:后台线程跑会话,文本经 `agent://chunk` 推送(带 turn_id),
// 结束发 `agent://done`,出错发 `agent://error`。turn_id 由前端分配,用于过滤/取消。
#[tauri::command]
pub fn agent_stream(
    app: AppHandle,
    registry: State<'_, AgentRegistry>,
    agent_cmd: String,
    prompt: String,
    turn_id: u64,
    cwd: Option<String>,
    mcp_servers: Option<Value>,
) {
    let children = Arc::clone(&registry.children);
    let cwd = resolve_cwd(cwd);
    let mcp_servers = mcp_servers.unwrap_or_else(|| json!([]));
    std::thread::spawn(move || {
        match run_stream(
            &app,
            &children,
            turn_id,
            &agent_cmd,
            &prompt,
            &cwd,
            &mcp_servers,
        ) {
            Ok(()) => {
                let _ = app.emit("agent://done", json!({ "turnId": turn_id }));
            }
            Err(e) => {
                let _ = app.emit("agent://error", json!({ "turnId": turn_id, "message": e }));
            }
        }
    });
}

// 取消进行中的流式会话:终止并回收其子进程(关闭对话框/开新会话时调用)。
#[tauri::command]
pub fn agent_cancel(registry: State<'_, AgentRegistry>, turn_id: u64) {
    if let Some(mut child) = registry.children.lock().unwrap().remove(&turn_id) {
        kill(&mut child);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        client_init_params, deny_reply, extract_agent_text, resolve_cwd, response_for, rpc_request,
        session_new_params, spawn_program_candidates,
    };
    use serde_json::{json, Value};

    // MCP 转发:用户配置的 server 原样进 session/new.mcpServers;非数组归一为空(见 ADR-0010)。
    #[test]
    fn session_new_forwards_mcp_servers() {
        let servers = json!([{ "name": "fs", "command": "mcp-fs", "args": [], "env": [] }]);
        let params = session_new_params("/work", &servers);
        assert_eq!(params["cwd"], "/work");
        assert_eq!(params["mcpServers"], servers);
        // 非数组 → 空数组(不把坏配置塞给 agent)
        assert_eq!(
            session_new_params("/w", &json!(null))["mcpServers"],
            json!([])
        );
    }

    // 工作目录收敛:传入工作区根则用它;缺省/空白回退进程目录(非空)。
    #[test]
    fn resolves_cwd_prefers_workspace_root() {
        assert_eq!(resolve_cwd(Some("/work/proj".to_string())), "/work/proj");
        assert!(!resolve_cwd(None).is_empty());
        assert!(!resolve_cwd(Some("   ".to_string())).is_empty());
        assert_ne!(resolve_cwd(Some("  ".to_string())), "  ");
    }

    // Windows npm 全局命令是 .cmd shim;无扩展命令需显式尝试 .cmd。
    #[cfg(windows)]
    #[test]
    fn windows_adds_cmd_candidate_for_npm_agent_shim() {
        assert_eq!(
            spawn_program_candidates("claude-code-acp"),
            vec![
                "claude-code-acp".to_string(),
                "claude-code-acp.cmd".to_string()
            ]
        );
        assert_eq!(
            spawn_program_candidates("claude-code-acp.cmd"),
            vec!["claude-code-acp.cmd".to_string()]
        );
    }

    // 安全边界回归守卫:Glyph 绝不向 agent 授予 fs/terminal 能力(改 true 即测试失败)。
    #[test]
    fn client_denies_fs_and_terminal_capabilities() {
        let caps = client_init_params()["clientCapabilities"].clone();
        assert_eq!(caps["fs"]["readTextFile"], false);
        assert_eq!(caps["fs"]["writeTextFile"], false);
        assert_eq!(caps["terminal"], false);
    }

    // agent → client 请求一律以错误回绝,绝不静默放行。
    #[test]
    fn denies_agent_requests_with_error() {
        let v: Value = serde_json::from_str(&deny_reply(7)).unwrap();
        assert_eq!(v["id"], 7);
        assert!(v.get("error").is_some());
        assert!(v.get("result").is_none());
    }

    #[test]
    fn builds_jsonrpc_request() {
        let s = rpc_request(0, "initialize", json!({ "protocolVersion": 1 }));
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["jsonrpc"], "2.0");
        assert_eq!(v["id"], 0);
        assert_eq!(v["method"], "initialize");
        assert_eq!(v["params"]["protocolVersion"], 1);
    }

    #[test]
    fn extracts_agent_message_text() {
        let msg = json!({
            "jsonrpc": "2.0", "method": "session/update",
            "params": { "sessionId": "s1", "update": { "sessionUpdate": "agent_message_chunk", "content": { "type": "text", "text": "hello" } } }
        });
        assert_eq!(extract_agent_text(&msg).as_deref(), Some("hello"));
        let other = json!({ "params": { "update": { "sessionUpdate": "tool_call" } } });
        assert!(extract_agent_text(&other).is_none());
    }

    #[test]
    fn matches_response_by_id() {
        let ok = json!({ "jsonrpc": "2.0", "id": 2, "result": { "stopReason": "end_turn" } });
        assert!(response_for(&ok, 2).unwrap().is_ok());
        assert!(response_for(&ok, 1).is_none());
        let err = json!({ "jsonrpc": "2.0", "id": 3, "error": { "code": -1, "message": "x" } });
        assert!(response_for(&err, 3).unwrap().is_err());
    }
}
