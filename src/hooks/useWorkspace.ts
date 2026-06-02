import { useCallback, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

// 当前打开的工作区(根文件夹)。文件树以此为根逐级懒读。
export function useWorkspace() {
  const [rootPath, setRootPath] = useState<string | null>(null);

  const openFolder = useCallback(async () => {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === "string") setRootPath(selected);
  }, []);

  const closeFolder = useCallback(() => setRootPath(null), []);

  return { rootPath, openFolder, closeFolder };
}
