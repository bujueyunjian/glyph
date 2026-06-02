// 前后端共享类型。与 src-tauri 的 Rust 类型保持对齐;
// 契约测试(src/__tests__/*.contract.test.ts)负责断言两侧一致。

/** 应用基础信息,对应 Rust 的 `AppInfo`(commands/app.rs)。 */
export interface AppInfo {
  name: string;
  version: string;
  tauriVersion: string;
}
