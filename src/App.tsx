import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";

import { getAppInfo } from "@/api/appApi";
import { CommandPalette } from "@/components/command/CommandPalette";
import { QuickOpen } from "@/components/command/QuickOpen";
import { FileTree } from "@/components/explorer/FileTree";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { EmptyState } from "@/components/workbench/EmptyState";
import { MenuBar } from "@/components/workbench/MenuBar";
import { TabBar } from "@/components/workbench/TabBar";
import { WorkbenchLayout } from "@/components/workbench/WorkbenchLayout";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { CommandAction } from "@/types/commandTypes";
import { getFileExtension } from "@/utils/path";

// 编辑器(含 CodeMirror 核心)懒加载:空态启动时不加载,打开文件才拉取。
const CodeEditor = lazy(() =>
  import("@/components/editor/CodeEditor").then((m) => ({
    default: m.CodeEditor,
  })),
);

function App() {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>();

  // 每个标签一个 CodeMirror 实例的 ref;保存时按 path 读对应实例的文档。
  const editorRefs = useRef<Map<string, ReactCodeMirrorRef | null>>(new Map());
  const getContent = useCallback(
    (path: string) =>
      editorRefs.current.get(path)?.view?.state.doc.toString() ?? "",
    [],
  );

  const { recent, addRecent, clearRecent } = useRecentFiles();
  const { settings, updateSetting, resetSettings } = useSettings();
  const {
    tabs,
    activePath,
    open,
    openPath,
    setActive,
    closeTab,
    save,
    saveAs,
    markDirty,
  } = useEditorTabs(getContent, addRecent);
  const { themes, activeTheme, setTheme } = useTheme();
  const { rootPath, openFolder, closeFolder } = useWorkspace();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 跳到当前文件指定行(Goto Anything 的 `:` 模式)。
  const goToLine = useCallback(
    (line: number) => {
      if (!activePath) return;
      const view = editorRefs.current.get(activePath)?.view;
      if (!view) return;
      const target = Math.min(Math.max(line, 1), view.state.doc.lines);
      const pos = view.state.doc.line(target).from;
      // 用事务规格跳转 + 滚动入视,避免静态导入 CodeMirror 包(保持首屏不含编辑器内核)。
      view.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      });
      view.focus();
    },
    [activePath],
  );

  // 编辑命令作用于激活编辑器;动态 import 避免把 CodeMirror 拉回首屏。
  const activeView = useCallback(
    () => (activePath ? editorRefs.current.get(activePath)?.view : undefined),
    [activePath],
  );
  const editorUndo = useCallback(async () => {
    const view = activeView();
    if (view) (await import("@codemirror/commands")).undo(view);
  }, [activeView]);
  const editorRedo = useCallback(async () => {
    const view = activeView();
    if (view) (await import("@codemirror/commands")).redo(view);
  }, [activeView]);
  const editorFind = useCallback(async () => {
    const view = activeView();
    if (view) (await import("@codemirror/search")).openSearchPanel(view);
  }, [activeView]);

  // 命令面板的命令集:按当前能力构建(文件操作 + 每个主题一条切换)。
  const commands = useMemo<CommandAction[]>(
    () => [
      {
        id: "file.open",
        title: t("file.open"),
        group: t("menu.file"),
        shortcut: "Ctrl/⌘ O",
        perform: open,
      },
      {
        id: "file.openFolder",
        title: t("file.openFolder"),
        group: t("menu.file"),
        perform: openFolder,
      },
      {
        id: "file.save",
        title: t("file.save"),
        group: t("menu.file"),
        shortcut: "Ctrl/⌘ S",
        perform: save,
      },
      {
        id: "file.saveAs",
        title: t("file.saveAs"),
        group: t("menu.file"),
        shortcut: "Ctrl/⌘ ⇧ S",
        perform: saveAs,
      },
      {
        id: "view.settings",
        title: t("settings.title"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ ,",
        perform: () => setSettingsOpen(true),
      },
      ...themes.map((th) => ({
        id: `theme.${th.id}`,
        title: `${t("menu.theme")}: ${th.label}`,
        group: t("menu.view"),
        perform: () => setTheme(th.id),
      })),
    ],
    [t, open, openFolder, save, saveAs, themes, setTheme],
  );

  useEffect(() => {
    // 版本号是非核心装饰:Tauri 上下文外(纯 pnpm dev)会失败,
    // 按 specflow 前端规范 §9,非核心旁路失败静默 + console.warn,不打扰用户。
    getAppInfo()
      .then((info) => setAppVersion(info.version))
      .catch((err) => console.warn("getAppInfo 失败(非 Tauri 上下文?):", err));
  }, []);

  // 切换标签后修正 CodeMirror 布局(从 display:none 切回需重测量)并聚焦。
  useEffect(() => {
    if (!activePath) return;
    const ref = editorRefs.current.get(activePath);
    ref?.view?.requestMeasure();
    ref?.view?.focus();
  }, [activePath]);

  // 全局快捷键:打开/保存/另存为/命令面板/关闭标签。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (event.shiftKey && key === "p") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (key === "p") {
        event.preventDefault();
        setQuickOpenOpen((prev) => !prev);
      } else if (key === "o") {
        event.preventDefault();
        void open();
      } else if (key === "s") {
        event.preventDefault();
        if (event.shiftKey) void saveAs();
        else void save();
      } else if (key === "w") {
        if (activePath) {
          event.preventDefault();
          closeTab(activePath);
        }
      } else if (key === "b") {
        event.preventDefault();
        setSidebarVisible((prev) => !prev);
      } else if (key === ",") {
        event.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, save, saveAs, closeTab, activePath]);

  return (
    <>
      <WorkbenchLayout
        appVersion={appVersion}
        sidebar={
          rootPath && sidebarVisible ? (
            <FileTree
              rootPath={rootPath}
              activePath={activePath ?? undefined}
              onOpenFile={openPath}
            />
          ) : undefined
        }
        menu={
          <MenuBar
            onOpen={open}
            onOpenFolder={openFolder}
            recentFiles={recent}
            onOpenRecent={openPath}
            onClearRecent={clearRecent}
            hasFolder={!!rootPath}
            onCloseFolder={closeFolder}
            onSave={save}
            onSaveAs={saveAs}
            canSave={!!activePath}
            onUndo={editorUndo}
            onRedo={editorRedo}
            onFind={editorFind}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
            onOpenSettings={() => setSettingsOpen(true)}
            themes={themes}
            activeThemeId={activeTheme.id}
            onThemeChange={setTheme}
            appVersion={appVersion}
          />
        }
      >
        <div className="flex h-full flex-col">
          {tabs.length > 0 ? (
            <TabBar
              tabs={tabs}
              activePath={activePath}
              onActivate={setActive}
              onClose={closeTab}
            />
          ) : null}
          <div className="min-h-0 flex-1">
            {tabs.length > 0 ? (
              <Suspense fallback={<div className="h-full w-full" />}>
                {tabs.map((tab) => (
                  <div
                    key={tab.path}
                    className={
                      tab.path === activePath ? "h-full w-full" : "hidden"
                    }
                  >
                    <CodeEditor
                      ref={(instance) => {
                        if (instance)
                          editorRefs.current.set(tab.path, instance);
                        else editorRefs.current.delete(tab.path);
                      }}
                      initialValue={tab.initialContent}
                      extension={getFileExtension(tab.path)}
                      themeKind={activeTheme.kind}
                      settings={settings}
                      onDocChange={() => markDirty(tab.path)}
                    />
                  </div>
                ))}
              </Suspense>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </WorkbenchLayout>
      <Toaster theme={activeTheme.kind} position="bottom-right" />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
      />
      <QuickOpen
        open={quickOpenOpen}
        onOpenChange={setQuickOpenOpen}
        rootPath={rootPath}
        onOpenFile={openPath}
        onGoToLine={goToLine}
      />
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
        themes={themes}
        activeThemeId={activeTheme.id}
        onThemeChange={setTheme}
      />
    </>
  );
}

export default App;
