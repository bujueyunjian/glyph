use ignore::WalkBuilder;
use serde::Serialize;
use std::fs;
use std::path::Path;

// 跨文件搜索:用 ignore crate 走目录(尊重 .gitignore / 隐藏文件),逐文件按字面量扫描行。
// v1 字面量 + 大小写开关;正则模式留后续。结果上限保护,超长行截断。

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    path: String,
    relative_path: String,
    line: usize,
    column: usize,
    line_text: String,
}

const MAX_HITS: usize = 5000;
const MAX_LINE_LEN: usize = 400;

// 在单文件内容中按字面量搜索,返回 (行号 1-based, 列 1-based 字节偏移, 行文本)。命令与单测共用。
fn search_in_text(content: &str, query: &str, case_sensitive: bool) -> Vec<(usize, usize, String)> {
    let needle = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    let mut hits = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        let hay = if case_sensitive {
            line.to_string()
        } else {
            line.to_lowercase()
        };
        if let Some(col) = hay.find(&needle) {
            let text: String = if line.len() > MAX_LINE_LEN {
                line.chars().take(MAX_LINE_LEN).collect()
            } else {
                line.to_string()
            };
            hits.push((idx + 1, col + 1, text));
        }
    }
    hits
}

// 在工作区内跨文件搜索。根不可读响亮报错;二进制/非 UTF-8 文件跳过。
#[tauri::command]
pub fn search_files(
    root: String,
    query: String,
    case_sensitive: bool,
) -> Result<Vec<SearchHit>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(format!("搜索根目录无效: {root}"));
    }

    let mut out: Vec<SearchHit> = Vec::new();
    for result in WalkBuilder::new(root_path).build() {
        if out.len() >= MAX_HITS {
            break;
        }
        let Ok(entry) = result else { continue };
        if !entry.file_type().is_some_and(|t| t.is_file()) {
            continue;
        }
        let path = entry.path();
        let Ok(content) = fs::read_to_string(path) else {
            continue; // 跳过二进制 / 非 UTF-8
        };
        let relative = path
            .strip_prefix(root_path)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/");
        let path_str = path.to_string_lossy().to_string();
        for (line, column, text) in search_in_text(&content, &query, case_sensitive) {
            if out.len() >= MAX_HITS {
                break;
            }
            out.push(SearchHit {
                path: path_str.clone(),
                relative_path: relative.clone(),
                line,
                column,
                line_text: text,
            });
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::search_in_text;

    #[test]
    fn finds_case_insensitive() {
        let hits = search_in_text("Hello\nworld\nHELLO there", "hello", false);
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0], (1, 1, "Hello".to_string()));
        assert_eq!(hits[1].0, 3);
    }

    #[test]
    fn case_sensitive_excludes_mismatch() {
        let hits = search_in_text("Hello\nhello", "hello", true);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].0, 2);
    }

    #[test]
    fn empty_when_no_match() {
        assert!(search_in_text("abc\ndef", "xyz", false).is_empty());
    }
}
