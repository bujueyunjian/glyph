use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// ACP(Agent Client Protocol)最小客户端:JSON-RPC 2.0 over ndjson stdio。
// v1 走轻量自研(仅 serde_json,无 tokio——贴合「轻」SLO,复用 std 子进程模型),
// 一次性 prompt 取完整文本。完整流式/会话保活/fs/terminal/权限留后续(见 ADR-0008)。

fn rpc_request(id: u64, method: &str, params: Value) -> String {
    json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params }).to_string()
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
                let err = json!({ "jsonrpc": "2.0", "id": req_id, "error": { "code": -32601, "message": "unsupported in Glyph v1" } });
                write_line(stdin, &err.to_string())?;
            }
        }
    }
}

fn agent_turn<R: BufRead>(
    reader: &mut R,
    stdin: &mut ChildStdin,
    prompt: &str,
    answer: &mut String,
) -> Result<(), String> {
    write_line(stdin, &rpc_request(0, "initialize", client_init_params()))?;
    pump_until(reader, stdin, 0, answer)?;

    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    write_line(
        stdin,
        &rpc_request(1, "session/new", json!({ "cwd": cwd, "mcpServers": [] })),
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

// 一次性向 ACP agent 发 prompt 取完整文本响应。agent_cmd 如 "claude-agent-acp"(用户已装的适配器)。
#[tauri::command]
pub fn agent_oneshot(agent_cmd: String, prompt: String) -> Result<String, String> {
    let mut parts = agent_cmd.split_whitespace();
    let program = parts
        .next()
        .ok_or_else(|| "agent 命令为空".to_string())?
        .to_string();
    let args: Vec<String> = parts.map(str::to_string).collect();

    let mut command = Command::new(&program);
    command
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|e| format!("启动 agent 失败 ({program}): {e}"))?;
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

    let outcome = agent_turn(&mut reader, &mut stdin, &prompt, &mut answer);
    kill(&mut child);
    outcome.map(|()| answer)
}

// 读 ndjson 直到 id 响应,途中把 agent 文本块经事件 `agent://chunk` 流式推送 UI。
fn pump_emit<R: BufRead>(
    app: &AppHandle,
    reader: &mut R,
    stdin: &mut ChildStdin,
    target_id: u64,
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
            let _ = app.emit("agent://chunk", text);
        } else if message.get("method").is_some() {
            if let Some(req_id) = message.get("id").and_then(Value::as_u64) {
                let err = json!({ "jsonrpc": "2.0", "id": req_id, "error": { "code": -32601, "message": "unsupported in Glyph v1" } });
                write_line(stdin, &err.to_string())?;
            }
        }
    }
}

fn stream_turn<R: BufRead>(
    app: &AppHandle,
    reader: &mut R,
    stdin: &mut ChildStdin,
    prompt: &str,
) -> Result<(), String> {
    let mut scratch = String::new();
    write_line(stdin, &rpc_request(0, "initialize", client_init_params()))?;
    pump_until(reader, stdin, 0, &mut scratch)?;

    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    write_line(
        stdin,
        &rpc_request(1, "session/new", json!({ "cwd": cwd, "mcpServers": [] })),
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
    pump_emit(app, reader, stdin, 2)
}

fn run_stream(app: &AppHandle, agent_cmd: &str, prompt: &str) -> Result<(), String> {
    let mut parts = agent_cmd.split_whitespace();
    let program = parts
        .next()
        .ok_or_else(|| "agent 命令为空".to_string())?
        .to_string();
    let args: Vec<String> = parts.map(str::to_string).collect();

    let mut command = Command::new(&program);
    command
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|e| format!("启动 agent 失败 ({program}): {e}"))?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取 agent stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取 agent stdout".to_string())?;
    let mut reader = BufReader::new(stdout);

    let outcome = stream_turn(app, &mut reader, &mut stdin, prompt);
    kill(&mut child);
    outcome
}

// 流式向 ACP agent 发 prompt:后台线程跑会话,文本经 `agent://chunk` 推送,
// 结束发 `agent://done`,出错发 `agent://error`。命令即时返回。
#[tauri::command]
pub fn agent_stream(app: AppHandle, agent_cmd: String, prompt: String) {
    std::thread::spawn(move || match run_stream(&app, &agent_cmd, &prompt) {
        Ok(()) => {
            let _ = app.emit("agent://done", ());
        }
        Err(e) => {
            let _ = app.emit("agent://error", e);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{extract_agent_text, response_for, rpc_request};
    use serde_json::json;

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
