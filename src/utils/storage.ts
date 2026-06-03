// localStorage 中 JSON 状态的读写。区分两态,对齐「失败响亮 · 禁止静默兜底」铁律:
// - 缺(键不存在)= 预期空态,返回 null,不报错。
// - 坏(JSON 解析失败)= 真实失败,corrupted=true,由调用方响亮报告(toast),
//   绝不静默当默认值吞掉。

export interface StoredRead<T> {
  /** 解析出的值;缺或坏时为 null。 */
  value: T | null;
  /** true 表示存在但 JSON 解析失败(数据损坏),需调用方响亮告知用户。 */
  corrupted: boolean;
}

export function readJson<T>(key: string): StoredRead<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) return { value: null, corrupted: false };
  try {
    return { value: JSON.parse(raw) as T, corrupted: false };
  } catch {
    return { value: null, corrupted: true };
  }
}

// 持久化 JSON。写入失败(隐私模式/配额)不是数据损坏 → 记 warn 不静默吞、不致命。
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`持久化 ${key} 失败:`, err);
  }
}
