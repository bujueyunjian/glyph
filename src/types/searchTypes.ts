// 跨文件搜索命中项。serde camelCase 对齐 Rust commands/search.rs 的 SearchHit。
export interface SearchHit {
  path: string;
  relativePath: string;
  line: number;
  column: number;
  lineText: string;
}
