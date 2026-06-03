import { useCallback, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

// 当前打开的工作区(根文件夹)。文件树以此为根逐级懒读。
// onOpened 在每次成功打开文件夹时回调(供最近文件夹历史记录)。
export function useWorkspace(onOpened?: (path: string) => void) {
  const [rootPath, setRootPath] = useState<string | null>(null);

  // 打开已知路径的文件夹(从"最近文件夹"重开)。
  const openFolderPath = useCallback(
    (path: string) => {
      setRootPath(path);
      onOpened?.(path);
    },
    [onOpened],
  );

  const openFolder = useCallback(async () => {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === "string") openFolderPath(selected);
  }, [openFolderPath]);

  const closeFolder = useCallback(() => setRootPath(null), []);

  return { rootPath, openFolder, openFolderPath, closeFolder };
}
