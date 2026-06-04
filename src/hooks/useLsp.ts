import { useEffect, useRef, useState } from "react";

import { lspStart, lspStop } from "@/api/lspApi";
import { serverForExtension } from "@/features/lsp/servers";
import { getDirName, getFileExtension } from "@/utils/path";

export type LspState = "off" | "starting" | "ready" | "unavailable";

export interface LspStatus {
  state: LspState;
  name?: string;
  /** 就绪时的服务器 id,供编辑器接补全/诊断。 */
  serverId?: number;
}

// 按当前文件语言自动连接语言服务器,返回连接状态供状态栏显示。
// 同语言同根的服务器复用(不随切标签重启);未装服务器则 unavailable(预期空态,不报错)。
// Glyph 不打包服务器(守"轻"):接入用户 PATH 中已装的那个。
export function useLsp(
  activePath: string | null,
  rootPath: string | null,
): LspStatus {
  const [status, setStatus] = useState<LspStatus>({ state: "off" });
  const current = useRef<{ id: number; key: string } | null>(null);

  useEffect(() => {
    const server = activePath
      ? serverForExtension(getFileExtension(activePath))
      : null;

    if (!activePath || !server) {
      if (current.current) {
        void lspStop(current.current.id);
        current.current = null;
      }
      setStatus({ state: "off" });
      return;
    }

    const root = rootPath ?? getDirName(activePath);
    const key = `${server.name}@${root}`;
    // 同服务器同根已在跑 → 复用,不重启。
    if (current.current?.key === key) {
      setStatus({
        state: "ready",
        name: server.name,
        serverId: current.current.id,
      });
      return;
    }
    if (current.current) {
      void lspStop(current.current.id);
      current.current = null;
    }

    let cancelled = false;
    setStatus({ state: "starting", name: server.name });
    void lspStart(server.command, server.args, `file://${root}`)
      .then((id) => {
        if (cancelled) {
          void lspStop(id);
          return;
        }
        current.current = { id, key };
        setStatus({ state: "ready", name: server.name, serverId: id });
      })
      .catch(() => {
        // 未安装/启动失败:预期空态(很多用户没装),静默显示未连接,不弹红 toast。
        if (!cancelled) setStatus({ state: "unavailable", name: server.name });
      });

    return () => {
      cancelled = true;
    };
  }, [activePath, rootPath]);

  // 卸载时回收服务器。
  useEffect(
    () => () => {
      if (current.current) {
        void lspStop(current.current.id);
        current.current = null;
      }
    },
    [],
  );

  return status;
}
