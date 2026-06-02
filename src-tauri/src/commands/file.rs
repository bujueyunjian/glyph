use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};

// 文件读写命令。失败一律响亮地返回 Err(String)(见架构「错误二分」),
// 由前端 call<T> 包成 Error 弹红 toast,绝不静默兜底。

#[tauri::command]
pub fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("打开文件失败 ({path}): {e}"))
}

// v1 直接写入;原子保存(临时文件 + rename)留 M1 硬化。
#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("保存文件失败 ({path}): {e}"))
}

// 文件树的一项。serde camelCase 对齐前端 src/types/fsTypes.ts 的 DirEntry。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

// 列出目录的直接子项(逐级懒读,不递归);目录优先、名称不分大小写排序。
#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let read = fs::read_dir(&path).map_err(|e| format!("读取目录失败 ({path}): {e}"))?;
    let mut entries: Vec<DirEntry> = Vec::new();
    for item in read {
        let item = item.map_err(|e| format!("读取目录项失败: {e}"))?;
        let entry_path = item.path();
        entries.push(DirEntry {
            name: item.file_name().to_string_lossy().to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir: entry_path.is_dir(),
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

// Goto Anything 的工作区文件项。relativePath 用于显示与模糊匹配,path 用于打开。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFile {
    path: String,
    relative_path: String,
}

// 递归索引时跳过的重型/无关目录(再叠加"隐藏目录"规则)。
const SKIP_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".cache",
    "__pycache__",
    ".venv",
    "vendor",
];
// 上限保护:超大仓库不至于一次拉爆(超出记为已知限制,见任务 0011)。
const MAX_FILES: usize = 20000;

// 递归列出工作区内的文件(供 Goto Anything 模糊查找)。
// 根目录不可读 → 响亮 Err;嵌套子目录不可读则跳过(预期的权限/系统目录)。
#[tauri::command]
pub fn list_files(root: String) -> Result<Vec<WorkspaceFile>, String> {
    let root_path = Path::new(&root);
    // 先验证根可读,失败响亮报错。
    fs::read_dir(root_path).map_err(|e| format!("读取目录失败 ({root}): {e}"))?;

    let mut out: Vec<WorkspaceFile> = Vec::new();
    let mut stack: Vec<PathBuf> = vec![root_path.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if out.len() >= MAX_FILES {
            break;
        }
        let Ok(read) = fs::read_dir(&dir) else {
            continue; // 嵌套子目录不可读,跳过
        };
        for item in read.flatten() {
            let entry_path = item.path();
            let name = item.file_name().to_string_lossy().to_string();
            if entry_path.is_dir() {
                if name.starts_with('.') || SKIP_DIRS.contains(&name.as_str()) {
                    continue;
                }
                stack.push(entry_path);
            } else {
                let relative = entry_path
                    .strip_prefix(root_path)
                    .unwrap_or(&entry_path)
                    .to_string_lossy()
                    .replace('\\', "/");
                out.push(WorkspaceFile {
                    path: entry_path.to_string_lossy().to_string(),
                    relative_path: relative,
                });
                if out.len() >= MAX_FILES {
                    break;
                }
            }
        }
    }
    out.sort_by(|a, b| {
        a.relative_path
            .to_lowercase()
            .cmp(&b.relative_path.to_lowercase())
    });
    Ok(out)
}
