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

// 原子保存:先写同目录临时文件,再 rename 覆盖目标。
// 同一文件系统上 rename 是原子操作 → 崩溃/断电不会留下半截文件。
#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);
    let dir = target
        .parent()
        .ok_or_else(|| format!("保存文件失败 ({path}): 无效的目标路径"))?;
    let file_name = target
        .file_name()
        .ok_or_else(|| format!("保存文件失败 ({path}): 无效的文件名"))?;
    // 临时文件必须与目标同目录,否则跨文件系统 rename 会失败。
    let tmp = dir.join(format!(".{}.glyphtmp", file_name.to_string_lossy()));
    fs::write(&tmp, content).map_err(|e| format!("保存文件失败 ({path}): 写入临时文件 {e}"))?;
    fs::rename(&tmp, target).map_err(|e| {
        // 替换失败时清理临时文件,不留垃圾。
        let _ = fs::remove_file(&tmp);
        format!("保存文件失败 ({path}): 替换目标 {e}")
    })
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
