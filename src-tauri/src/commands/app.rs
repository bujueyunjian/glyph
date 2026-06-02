use serde::Serialize;

// 应用基础信息。serde camelCase 对齐前端 src/types/appTypes.ts 的 AppInfo。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    tauri_version: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Glyph".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: tauri::VERSION.to_string(),
    }
}
