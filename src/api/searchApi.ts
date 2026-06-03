import { call } from "./ipc";
import type { SearchHit } from "@/types/searchTypes";

// 跨文件搜索命令封装。对应 Rust commands/search.rs。
export function searchFiles(
  root: string,
  query: string,
  caseSensitive: boolean,
): Promise<SearchHit[]> {
  return call<SearchHit[]>("search_files", { root, query, caseSensitive });
}
