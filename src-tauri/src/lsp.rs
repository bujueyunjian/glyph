use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// LSP 客户端(table-stakes:补全/诊断/跳转)。按 LSP 规范用 `Content-Length` 帧封装
// JSON-RPC,spawn 语言服务器子进程 + 双向帧 stdio + initialize 握手 + 完整消息推 UI。
// 遵铁律「重活在 Rust」:协议在 Rust 跑,前端只渲染结果(补全源/诊断标记)。
// 故可在无显示环境对真实语言服务器端到端验证(见 tests:对 rust-analyzer 跑 initialize 握手)。
// 后续:textDocument/didOpen + completion/hover + publishDiagnostics 路由到前端渲染。

// 受管语言服务器:句柄(终止用)+ stdin(写入用)。
struct ManagedServer {
    child: Child,
    stdin: ChildStdin,
}

// 语言服务器注册表,挂到 Tauri State,按 id 管理多个服务器。
#[derive(Default)]
pub struct LspRegistry {
    next_id: Mutex<u32>,
    servers: Mutex<HashMap<u32, ManagedServer>>,
}

// 收到的完整 LSP 消息事件载荷;serde camelCase 对齐前端。
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LspMessage {
    id: u32,
    message: String,
}

// 按 LSP 规范封装一条消息:`Content-Length` 头(字节数)+ CRLF 空行 + JSON 体。
fn encode_message(json: &str) -> Vec<u8> {
    let mut out = format!("Content-Length: {}\r\n\r\n", json.len()).into_bytes();
    out.extend_from_slice(json.as_bytes());
    out
}

// 读取一条 LSP 帧:逐行解析头部拿 Content-Length,再**按字节精确读** N 字节体
// (体内可含换行,故不能按行读)。流在消息边界干净结束返回 Ok(None);
// 头缺失/体截断返回 Err —— 失败响亮,不静默兜底。
fn read_message<R: BufRead>(reader: &mut R) -> std::io::Result<Option<String>> {
    let mut content_length: Option<usize> = None;
    let mut header = String::new();
    loop {
        header.clear();
        let n = reader.read_line(&mut header)?;
        if n == 0 {
            return Ok(None); // 消息边界处 EOF:正常结束
        }
        let trimmed = header.trim_end();
        if trimmed.is_empty() {
            break; // 空行 → 头部结束
        }
        // 头字段名大小写不敏感(LSP 规范);get(..15) 确保 15 为字符边界,切片安全。
        if let Some(head) = trimmed.get(..15) {
            if head.eq_ignore_ascii_case("Content-Length:") {
                content_length = trimmed[15..].trim().parse::<usize>().ok();
            }
        }
    }
    let len = content_length.ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidData, "LSP 帧缺少 Content-Length")
    })?;
    let mut body = vec![0u8; len];
    reader.read_exact(&mut body)?;
    String::from_utf8(body)
        .map(Some)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
}

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

// spawn 语言服务器并完成 initialize 握手;成功后发 `lsp://ready`(带 capabilities),
// 再起后台线程读后续帧消息经 `lsp://message` 推 UI,结束发 `lsp://closed`。
// 握手在命令内同步完成(数百 ms),失败响亮返回 Err。返回 id 供后续 send/stop。
#[tauri::command]
pub fn lsp_start(
    app: AppHandle,
    registry: State<'_, LspRegistry>,
    program: String,
    args: Vec<String>,
    root_uri: String,
) -> Result<u32, String> {
    let mut child = build_command(&program, &args)
        .spawn()
        .map_err(|e| format!("启动语言服务器失败 ({program}): {e}"))?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取服务器 stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取服务器 stdout".to_string())?;
    let mut reader = BufReader::new(stdout);

    // 起始必经 initialize 握手:拿到 capabilities 才算就绪。
    let capabilities = lsp_initialize(&mut reader, &mut stdin, &root_uri)?;

    let id = {
        let mut next = registry.next_id.lock().unwrap();
        *next += 1;
        *next
    };
    let _ = app.emit(
        "lsp://ready",
        json!({ "id": id, "capabilities": capabilities }),
    );

    // 握手已消费完 initialize 响应;reader 移入线程继续读诊断/响应等后续帧。
    std::thread::spawn(move || {
        while let Ok(Some(message)) = read_message(&mut reader) {
            let _ = app.emit("lsp://message", LspMessage { id, message });
        }
        let _ = app.emit("lsp://closed", id);
    });

    registry
        .servers
        .lock()
        .unwrap()
        .insert(id, ManagedServer { child, stdin });
    Ok(id)
}

// 向语言服务器发一条 JSON-RPC 消息(自动加 Content-Length 帧)。
#[tauri::command]
pub fn lsp_send(registry: State<'_, LspRegistry>, id: u32, message: String) -> Result<(), String> {
    let mut servers = registry.servers.lock().unwrap();
    let server = servers
        .get_mut(&id)
        .ok_or_else(|| format!("语言服务器 {id} 不存在"))?;
    server
        .stdin
        .write_all(&encode_message(&message))
        .map_err(|e| format!("写入服务器 {id} 失败: {e}"))?;
    server
        .stdin
        .flush()
        .map_err(|e| format!("刷新服务器 {id} 失败: {e}"))
}

// LSP initialize 请求参数(rootUri = 工作区根)。抽出便于单测请求形状。
fn initialize_params(root_uri: &str) -> Value {
    json!({
        "processId": null,
        "rootUri": root_uri,
        "capabilities": {
            "textDocument": {
                "completion": { "completionItem": { "snippetSupport": false } },
                "hover": {},
                "publishDiagnostics": {}
            }
        },
        "clientInfo": { "name": "glyph", "version": env!("CARGO_PKG_VERSION") }
    })
}

// 读取直到 id 的响应,握手阶段忽略其它消息(服务器通知/请求,如 window/logMessage)。
fn read_response<R: BufRead>(reader: &mut R, target_id: u64) -> Result<Value, String> {
    loop {
        let raw = read_message(reader)
            .map_err(|e| format!("读取语言服务器失败: {e}"))?
            .ok_or_else(|| "语言服务器在响应前结束了".to_string())?;
        let message: Value =
            serde_json::from_str(&raw).map_err(|e| format!("语言服务器响应非法 JSON: {e}"))?;
        if message.get("id").and_then(Value::as_u64) == Some(target_id) {
            if let Some(err) = message.get("error") {
                return Err(err.to_string());
            }
            return Ok(message.get("result").cloned().unwrap_or(Value::Null));
        }
    }
}

// 执行 LSP initialize 握手:发 initialize(id=0)→读响应→发 initialized 通知。
// 返回服务器 result(含 capabilities)。LSP 会话起始必经此步(每个客户端都要)。
pub fn lsp_initialize<R: BufRead, W: Write>(
    reader: &mut R,
    stdin: &mut W,
    root_uri: &str,
) -> Result<Value, String> {
    let request = json!({
        "jsonrpc": "2.0", "id": 0, "method": "initialize", "params": initialize_params(root_uri)
    });
    stdin
        .write_all(&encode_message(&request.to_string()))
        .and_then(|()| stdin.flush())
        .map_err(|e| format!("写入 initialize 失败: {e}"))?;

    let result = read_response(reader, 0)?;

    let initialized = json!({ "jsonrpc": "2.0", "method": "initialized", "params": {} });
    stdin
        .write_all(&encode_message(&initialized.to_string()))
        .and_then(|()| stdin.flush())
        .map_err(|e| format!("写入 initialized 失败: {e}"))?;

    Ok(result)
}

// 终止并移除语言服务器。
#[tauri::command]
pub fn lsp_stop(registry: State<'_, LspRegistry>, id: u32) -> Result<(), String> {
    let mut server = registry
        .servers
        .lock()
        .unwrap()
        .remove(&id)
        .ok_or_else(|| format!("语言服务器 {id} 不存在"))?;
    server
        .child
        .kill()
        .map_err(|e| format!("终止服务器 {id} 失败: {e}"))
}

#[cfg(test)]
mod tests {
    use super::{encode_message, initialize_params, lsp_initialize, read_message};
    use std::io::Cursor;

    #[test]
    fn encodes_with_content_length_header() {
        let framed = encode_message("{\"x\":1}");
        assert_eq!(
            String::from_utf8(framed).unwrap(),
            "Content-Length: 7\r\n\r\n{\"x\":1}"
        );
    }

    #[test]
    fn round_trips_single_message_then_eof() {
        let json = "{\"jsonrpc\":\"2.0\",\"id\":1}";
        let mut reader = Cursor::new(encode_message(json));
        assert_eq!(read_message(&mut reader).unwrap().as_deref(), Some(json));
        assert_eq!(read_message(&mut reader).unwrap(), None);
    }

    #[test]
    fn reads_multiple_framed_messages_in_one_stream() {
        let mut bytes = encode_message("{\"a\":1}");
        bytes.extend(encode_message("{\"b\":2}"));
        let mut reader = Cursor::new(bytes);
        assert_eq!(
            read_message(&mut reader).unwrap().as_deref(),
            Some("{\"a\":1}")
        );
        assert_eq!(
            read_message(&mut reader).unwrap().as_deref(),
            Some("{\"b\":2}")
        );
        assert_eq!(read_message(&mut reader).unwrap(), None);
    }

    #[test]
    fn reads_body_with_embedded_newline_by_byte_count() {
        // 体内含真实换行字节:验证按 Content-Length 字节读,而非按行截断。
        let json = "{\"text\":\"a\nb\"}";
        let mut reader = Cursor::new(encode_message(json));
        assert_eq!(read_message(&mut reader).unwrap().as_deref(), Some(json));
    }

    #[test]
    fn errors_loudly_when_header_missing_length() {
        let mut reader = Cursor::new(b"X-Foo: bar\r\n\r\n".to_vec());
        assert!(read_message(&mut reader).is_err());
    }

    #[test]
    fn initialize_params_carry_root_and_client_info() {
        let params = initialize_params("file:///work");
        assert_eq!(params["rootUri"], "file:///work");
        assert_eq!(params["clientInfo"]["name"], "glyph");
        assert!(params["capabilities"]["textDocument"]["completion"].is_object());
    }

    // 端到端握手:对真实 rust-analyzer 验证 spawn + 帧 + initialize 全栈。
    // CI(ubuntu)无 rust-analyzer 故 #[ignore];本地 `cargo test -- --ignored` 运行。
    #[test]
    #[ignore = "需本地安装 rust-analyzer(rustup component add rust-analyzer);CI 无此二进制"]
    fn initialize_handshake_against_rust_analyzer() {
        use super::build_command;
        use std::io::BufReader;

        let mut child = build_command("rust-analyzer", &[])
            .spawn()
            .expect("spawn rust-analyzer");
        let mut stdin = child.stdin.take().expect("stdin");
        let stdout = child.stdout.take().expect("stdout");
        let mut reader = BufReader::new(stdout);

        let root = format!("file://{}", std::env::current_dir().unwrap().display());
        let result = lsp_initialize(&mut reader, &mut stdin, &root).expect("initialize 握手");
        assert!(
            result.get("capabilities").is_some(),
            "initialize 应返回 capabilities,实际: {result}"
        );

        let _ = child.kill();
        let _ = child.wait();
    }
}
