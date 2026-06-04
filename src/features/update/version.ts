// 语义版本比较(纯函数,可单测)。用于"检查更新":比对当前版本与 GitHub 最新发布。
// 只处理 x.y.z(可带 v 前缀);非数字段按 0 处理,保持健壮。

export function parseVersion(v: string): [number, number, number] {
  const cleaned = v.trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((p) => parseInt(p, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

// latest 是否严格新于 current。
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}
