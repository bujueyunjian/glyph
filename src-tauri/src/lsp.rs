use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// LSP 传输层地基(table-stakes:补全/诊断/跳转)。按 LSP 规范用 `Content-Length` 帧
// 封装 JSON-RPC,spawn 语言服务器子进程 + 双向帧 stdio + 完整消息推 UI。
// 分层落地(对齐 ACP 客户端 0024):本增量打通可单测的传输层;前端经
// `@codemirror/lsp-client` 桥接 + 真实补全/诊断端到端需安装语言服务器自验。

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

// spawn 语言服务器;后台线程读帧消息,经 `lsp://message` 推 UI,结束发 `lsp://closed`。
// 返回 id 供后续 send/stop。
#[tauri::command]
pub fn lsp_start(
    app: AppHandle,
    registry: State<'_, LspRegistry>,
    program: String,
    args: Vec<String>,
) -> Result<u32, String> {
    let mut child = build_command(&program, &args)
        .spawn()
        .map_err(|e| format!("启动语言服务器失败 ({program}): {e}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取服务器 stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取服务器 stdout".to_string())?;

    let id = {
        let mut next = registry.next_id.lock().unwrap();
        *next += 1;
        *next
    };

    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
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
    use super::{encode_message, read_message};
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
}
