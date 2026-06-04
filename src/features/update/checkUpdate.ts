import { isNewerVersion } from "./version";

// 经 GitHub Releases API 检查更新(无需签名/证书,仅通知 + 跳转下载页)。
// 不做自动下载安装(那需 minisign 签名 + 证书,见 PROGRESS 剩余项 E)。
const RELEASES_API =
  "https://api.github.com/repos/bujueyunjian/glyph/releases/latest";
const RELEASES_PAGE = "https://github.com/bujueyunjian/glyph/releases/latest";

export interface UpdateInfo {
  available: boolean;
  latest: string;
  url: string;
}

// 返回是否有更新及最新版本号;网络/解析失败抛错,由调用方响亮提示(不静默兜底)。
export async function checkForUpdate(current: string): Promise<UpdateInfo> {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }
  const data: { tag_name?: unknown } = await res.json();
  const latest = typeof data.tag_name === "string" ? data.tag_name : "";
  if (!latest) {
    throw new Error("发布信息缺少 tag_name");
  }
  return {
    available: isNewerVersion(latest, current),
    latest: latest.replace(/^v/i, ""),
    url: RELEASES_PAGE,
  };
}
