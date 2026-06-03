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
import { ask } from "@tauri-apps/plugin-dialog";
import { Toaster, toast } from "sonner";
import { useTranslation } from "react-i18next";

import { getAppInfo } from "@/api/appApi";
import { createDir, createFile, deletePath, renamePath } from "@/api/fileApi";
import { watchWorkspace } from "@/api/workspaceApi";
import { agentStream } from "@/api/agentApi";
import { CommandPalette } from "@/components/command/CommandPalette";
import { QuickOpen } from "@/components/command/QuickOpen";
import { SearchPanel } from "@/components/command/SearchPanel";
import { AgentResultDialog } from "@/components/command/AgentResultDialog";
import { FileTree } from "@/components/explorer/FileTree";
import type { FileTreeActions } from "@/components/explorer/FileTreeNode";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import {
  PromptDialog,
  type PromptRequest,
} from "@/components/common/PromptDialog";
import { EmptyState } from "@/components/workbench/EmptyState";
import { MenuBar } from "@/components/workbench/MenuBar";
import { TabBar } from "@/components/workbench/TabBar";
import { WorkbenchLayout } from "@/components/workbench/WorkbenchLayout";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { useSession } from "@/hooks/useSession";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { CommandAction } from "@/types/commandTypes";
import {
  addPrefix,
  addSuffix,
  dedupeLines,
  mergeSpans,
  sortLines,
  toLowerCase,
  toUpperCase,
  trimLineEnds,
  wrapLines,
} from "@/features/textops/lineOps";
import { getDirName, getFileExtension, joinPath } from "@/utils/path";

// 编辑器(含 CodeMirror 核心)懒加载:空态启动时不加载,打开文件才拉取。
const CodeEditor = lazy(() =>
  import("@/components/editor/CodeEditor").then((m) => ({
    default: m.CodeEditor,
  })),
);

// Markdown 预览懒加载:marked/dompurify 随它进按需 chunk,不进首屏(性能红线)。
const MarkdownPreview = lazy(() =>
  import("@/components/editor/MarkdownPreview").then((m) => ({
    default: m.MarkdownPreview,
  })),
);

function App() {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>();

  // CodeMirror 实例 ref:主面板与分屏各一套(按 path)。读取按聚焦面板取。
  const editorRefs = useRef<Map<string, ReactCodeMirrorRef | null>>(new Map());
  const splitRefs = useRef<Map<string, ReactCodeMirrorRef | null>>(new Map());
  const focusedPaneRef = useRef<"main" | "split">("main");
  const getContent = useCallback((path: string) => {
    const refs = focusedPaneRef.current === "split" ? splitRefs : editorRefs;
    return refs.current.get(path)?.view?.state.doc.toString() ?? "";
  }, []);

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
    reorderTabs,
  } = useEditorTabs(getContent, addRecent);
  const { themes, activeTheme, setTheme } = useTheme();
  const { rootPath, openFolder, closeFolder } = useWorkspace();
  const { loadSession, saveSession } = useSession();
  // 镜像未保存状态,供窗口关闭处理器读取最新值。
  const hasDirtyRef = useRef(false);
  hasDirtyRef.current = tabs.some((tab) => tab.isDirty);
  // 会话恢复的光标位:启动时载入,挂载时由各 CodeEditor 应用一次。
  const restoredCursorsRef = useRef<Record<string, number>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const previewTimerRef = useRef<number | undefined>(undefined);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  // 流式 agent 会话的监听解绑函数;关闭对话框或开新会话时调用,避免监听泄漏。
  const agentCleanupRef = useRef<(() => void) | null>(null);
  const closeAgentResult = useCallback(() => {
    agentCleanupRef.current?.();
    agentCleanupRef.current = null;
    setAgentResult(null);
  }, []);

  // 向 ACP agent 流式提问:响应分块经事件回流,逐块追加到只读对话框(打字热路径之外)。
  const askAgent = useCallback(
    (agentCmd: string, prompt: string) => {
      agentCleanupRef.current?.();
      setAgentResult(""); // 开空对话框,等待流式分块
      agentStream(agentCmd, prompt, {
        onChunk: (text) => setAgentResult((prev) => (prev ?? "") + text),
        onDone: () => {
          agentCleanupRef.current?.();
          agentCleanupRef.current = null;
        },
        onError: (msg) => {
          agentCleanupRef.current?.();
          agentCleanupRef.current = null;
          setAgentResult(null);
          toast.error(t("agent.failed", { msg }));
        },
      })
        .then((cleanup) => {
          agentCleanupRef.current = cleanup;
        })
        .catch((err) => {
          setAgentResult(null);
          toast.error(t("agent.failed", { msg: (err as Error).message }));
        });
    },
    [t],
  );
  const [splitPath, setSplitPath] = useState<string | null>(null);
  const [focusedPane, setFocusedPaneState] = useState<"main" | "split">("main");
  const setFocusedPane = useCallback((pane: "main" | "split") => {
    focusedPaneRef.current = pane;
    setFocusedPaneState(pane);
  }, []);
  // 聚焦面板的当前文件(save/undo/find/变换作用对象)。
  const effectiveActive = focusedPane === "split" ? splitPath : activePath;

  const doSave = useCallback(() => {
    if (effectiveActive) void save(effectiveActive);
  }, [effectiveActive, save]);
  const doSaveAs = useCallback(() => {
    if (effectiveActive) void saveAs(effectiveActive);
  }, [effectiveActive, saveAs]);

  // 打开文件到聚焦面板:分屏聚焦则开进分屏(不动主面板激活),否则开进主面板。
  const openInFocused = useCallback(
    (path: string) => {
      if (focusedPaneRef.current === "split") {
        void openPath(path, false);
        setSplitPath(path);
      } else {
        void openPath(path);
      }
    },
    [openPath],
  );

  // 切换分屏:已开则关(回主面板),否则把当前文件开进分屏。
  const toggleSplit = useCallback(() => {
    setSplitPath((cur) => {
      if (cur !== null) {
        setFocusedPane("main");
        return null;
      }
      return activePath;
    });
  }, [activePath, setFocusedPane]);

  // 关闭标签并同步:若该文件正在分屏显示,一并关掉分屏视图。
  const closeTabSynced = useCallback(
    (path: string) => {
      closeTab(path);
      setSplitPath((cur) => (cur === path ? null : cur));
    },
    [closeTab],
  );

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
  const activeView = useCallback(() => {
    const refs = focusedPane === "split" ? splitRefs : editorRefs;
    const path = focusedPane === "split" ? splitPath : activePath;
    return path ? refs.current.get(path)?.view : undefined;
  }, [focusedPane, splitPath, activePath]);
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

  // 文本力量:行变换作用于每个选区(扩到整行、合并重叠)或整篇;纯函数 + view.dispatch(不静态导入 CM)。
  const transformLines = useCallback(
    (fn: (text: string) => string) => {
      const view = activeView();
      if (!view) return;
      const { state } = view;
      const nonEmpty = state.selection.ranges.filter((range) => !range.empty);
      const rawSpans = nonEmpty.length
        ? nonEmpty.map((range) => ({
            from: state.doc.lineAt(range.from).from,
            to: state.doc.lineAt(range.to).to,
          }))
        : [{ from: 0, to: state.doc.length }];
      const changes = mergeSpans(rawSpans).flatMap((span) => {
        const text = state.doc.sliceString(span.from, span.to);
        const next = fn(text);
        return next === text
          ? []
          : [{ from: span.from, to: span.to, insert: next }];
      });
      if (changes.length) view.dispatch({ changes });
      view.focus();
    },
    [activeView],
  );

  // 跨文件搜索命中跳转:打开文件,轮询等编辑器就绪后跳到行(应对懒加载挂载时序)。
  const openHit = useCallback(
    (path: string, line: number) => {
      void openPath(path);
      let tries = 0;
      const jump = () => {
        const view = editorRefs.current.get(path)?.view;
        if (view) {
          const target = Math.min(Math.max(line, 1), view.state.doc.lines);
          const pos = view.state.doc.line(target).from;
          view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
          view.focus();
        } else if (tries++ < 20) {
          setTimeout(jump, 50);
        }
      };
      setTimeout(jump, 50);
    },
    [openPath],
  );

  // 编辑回调:标脏 + (预览开启时)防抖刷新 Markdown 预览内容(不阻塞打字热路径)。
  const handleDocChange = useCallback(
    (path: string) => {
      markDirty(path);
      if (previewOpen && path === activePath) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = window.setTimeout(
          () => setPreviewContent(getContent(path)),
          200,
        );
      }
    },
    [markDirty, previewOpen, activePath, getContent],
  );

  const activeIsMarkdown =
    !!activePath && ["md", "markdown"].includes(getFileExtension(activePath));

  // 预览开启或切换文件时,立即用当前文档内容刷新预览。
  useEffect(() => {
    if (previewOpen && activePath) setPreviewContent(getContent(activePath));
  }, [previewOpen, activePath, getContent]);

  // 文件树增删改:弹输入/确认 → 调命令 → 刷新(treeVersion 变更使 FileTree 重挂载重列)。
  const treeActions = useMemo<FileTreeActions>(
    () => ({
      onCreate: (parentDir, isDir) =>
        setPromptReq({
          title: isDir ? t("explorer.newFolder") : t("explorer.newFile"),
          fields: [{ key: "name", label: t("explorer.nameLabel") }],
          onSubmit: (v) => {
            const name = v.name?.trim();
            if (!name) return;
            const target = joinPath(parentDir, name);
            (isDir ? createDir(target) : createFile(target))
              .then(() => setTreeVersion((n) => n + 1))
              .catch((err) =>
                toast.error(
                  t("explorer.opFailed", { msg: (err as Error).message }),
                ),
              );
          },
        }),
      onRename: (path, name) =>
        setPromptReq({
          title: t("explorer.rename"),
          fields: [
            { key: "name", label: t("explorer.nameLabel"), defaultValue: name },
          ],
          onSubmit: (v) => {
            const next = v.name?.trim();
            if (!next || next === name) return;
            renamePath(path, joinPath(getDirName(path), next))
              .then(() => setTreeVersion((n) => n + 1))
              .catch((err) =>
                toast.error(
                  t("explorer.opFailed", { msg: (err as Error).message }),
                ),
              );
          },
        }),
      onDelete: (path, name) => {
        void (async () => {
          const ok = await ask(t("explorer.confirmDelete", { name }), {
            kind: "warning",
          });
          if (!ok) return;
          try {
            await deletePath(path);
            closeTab(path);
            setTreeVersion((n) => n + 1);
          } catch (err) {
            toast.error(
              t("explorer.opFailed", { msg: (err as Error).message }),
            );
          }
        })();
      },
    }),
    [t, closeTab],
  );

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
        perform: doSave,
      },
      {
        id: "file.saveAs",
        title: t("file.saveAs"),
        group: t("menu.file"),
        shortcut: "Ctrl/⌘ ⇧ S",
        perform: doSaveAs,
      },
      {
        id: "view.settings",
        title: t("settings.title"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ ,",
        perform: () => setSettingsOpen(true),
      },
      {
        id: "search.files",
        title: t("search.title"),
        group: t("menu.edit"),
        shortcut: "Ctrl/⌘ ⇧ F",
        perform: () => setSearchOpen(true),
      },
      {
        id: "markdown.preview",
        title: t("preview.title"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ ⇧ V",
        perform: () => setPreviewOpen((prev) => !prev),
      },
      {
        id: "view.split",
        title: t("view.split"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ \\",
        perform: toggleSplit,
      },
      {
        id: "agent.ask",
        title: t("agent.ask"),
        group: t("agent.group"),
        perform: () =>
          setPromptReq({
            title: t("agent.ask"),
            fields: [
              {
                key: "agent",
                label: t("agent.cmdLabel"),
                defaultValue: "claude-agent-acp",
              },
              { key: "prompt", label: t("agent.promptLabel") },
            ],
            onSubmit: (v) => {
              const prompt = v.prompt?.trim();
              if (!prompt) return;
              askAgent(v.agent?.trim() || "claude-agent-acp", prompt);
            },
          }),
      },
      {
        id: "textops.trimEnd",
        title: t("textops.trimEnd"),
        group: t("textops.group"),
        perform: () => transformLines(trimLineEnds),
      },
      {
        id: "textops.sortLines",
        title: t("textops.sortLines"),
        group: t("textops.group"),
        perform: () => transformLines(sortLines),
      },
      {
        id: "textops.dedupeLines",
        title: t("textops.dedupeLines"),
        group: t("textops.group"),
        perform: () => transformLines(dedupeLines),
      },
      {
        id: "textops.upperCase",
        title: t("textops.upperCase"),
        group: t("textops.group"),
        perform: () => transformLines(toUpperCase),
      },
      {
        id: "textops.lowerCase",
        title: t("textops.lowerCase"),
        group: t("textops.group"),
        perform: () => transformLines(toLowerCase),
      },
      {
        id: "textops.addPrefix",
        title: t("textops.addPrefix"),
        group: t("textops.group"),
        perform: () =>
          setPromptReq({
            title: t("textops.addPrefix"),
            fields: [{ key: "prefix", label: t("textops.prefixLabel") }],
            onSubmit: (v) =>
              transformLines((text) => addPrefix(text, v.prefix ?? "")),
          }),
      },
      {
        id: "textops.addSuffix",
        title: t("textops.addSuffix"),
        group: t("textops.group"),
        perform: () =>
          setPromptReq({
            title: t("textops.addSuffix"),
            fields: [{ key: "suffix", label: t("textops.suffixLabel") }],
            onSubmit: (v) =>
              transformLines((text) => addSuffix(text, v.suffix ?? "")),
          }),
      },
      {
        id: "textops.wrap",
        title: t("textops.wrap"),
        group: t("textops.group"),
        perform: () =>
          setPromptReq({
            title: t("textops.wrap"),
            fields: [
              { key: "prefix", label: t("textops.prefixLabel") },
              { key: "suffix", label: t("textops.suffixLabel") },
            ],
            onSubmit: (v) =>
              transformLines((text) =>
                wrapLines(text, v.prefix ?? "", v.suffix ?? ""),
              ),
          }),
      },
      ...themes.map((th) => ({
        id: `theme.${th.id}`,
        title: `${t("menu.theme")}: ${th.label}`,
        group: t("menu.view"),
        perform: () => setTheme(th.id),
      })),
    ],
    [
      t,
      open,
      openFolder,
      doSave,
      doSaveAs,
      themes,
      setTheme,
      transformLines,
      toggleSplit,
      askAgent,
    ],
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
      } else if (event.shiftKey && key === "f") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (event.shiftKey && key === "v") {
        event.preventDefault();
        setPreviewOpen((prev) => !prev);
      } else if (key === "o") {
        event.preventDefault();
        void open();
      } else if (key === "s") {
        event.preventDefault();
        if (event.shiftKey) doSaveAs();
        else doSave();
      } else if (key === "w") {
        if (effectiveActive) {
          event.preventDefault();
          if (focusedPane === "split") {
            setSplitPath(null);
            setFocusedPane("main");
          } else {
            closeTabSynced(effectiveActive);
          }
        }
      } else if (key === "\\") {
        event.preventDefault();
        toggleSplit();
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
  }, [
    open,
    doSave,
    doSaveAs,
    closeTabSynced,
    activePath,
    effectiveActive,
    focusedPane,
    toggleSplit,
    setFocusedPane,
  ]);

  // 会话恢复:启动时一次,打开上次会话的文件(缺=空态;坏 JSON 已在 loadSession 响亮报错)。
  const restoreStarted = useRef(false);
  const restoreDone = useRef(false);
  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    const session = loadSession();
    if (session?.cursors) restoredCursorsRef.current = session.cursors;
    void (async () => {
      if (session && session.openPaths.length > 0) {
        const { openPaths, activePath: savedActive } = session;
        // 激活项最后打开,使其自然成为当前标签;已删文件由 openPath 响亮提示并跳过。
        const ordered = savedActive
          ? [...openPaths.filter((p) => p !== savedActive), savedActive]
          : openPaths;
        for (const path of ordered) {
          await openPath(path);
        }
      }
      restoreDone.current = true;
    })();
  }, [loadSession, openPath]);

  // 会话持久化:恢复完成后,标签/激活项变更即存(恢复期间不写,避免清空上次会话)。
  // 光标位在切换/开关标签时一并快照(此刻各文件 CodeMirror 实例仍在,可读取)。
  useEffect(() => {
    if (!restoreDone.current) return;
    const cursors: Record<string, number> = {};
    for (const tab of tabs) {
      const head = editorRefs.current.get(tab.path)?.view?.state.selection.main
        .head;
      if (head != null) cursors[tab.path] = head;
    }
    saveSession(
      tabs.map((tab) => tab.path),
      activePath,
      cursors,
    );
  }, [tabs, activePath, saveSession]);

  // 文件监听:rootPath 变更则监听工作区,fs://changed 防抖刷新文件树(动态 import 不进首屏)。
  useEffect(() => {
    if (!rootPath) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let timer: number | undefined;
    void (async () => {
      try {
        await watchWorkspace(rootPath);
        const { listen } = await import("@tauri-apps/api/event");
        const fn = await listen("fs://changed", () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => setTreeVersion((n) => n + 1), 300);
        });
        if (disposed) fn();
        else unlisten = fn;
      } catch (err) {
        console.warn("文件监听注册失败(非 Tauri 上下文?):", err);
      }
    })();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unlisten?.();
    };
  }, [rootPath]);

  // 拦截整窗关闭:有未保存内容时确认兜底(退出不可撤销,故此处用确认而非撤销)。
  // 动态 import 窗口 API:挂载期一次性逻辑,不进首屏(守"首屏只含外壳"红线)。
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const fn = await win.onCloseRequested(async (event) => {
          if (!hasDirtyRef.current) return; // 无未保存 → 放行
          event.preventDefault();
          const quit = await ask(t("file.quitUnsaved"), { kind: "warning" });
          if (quit) await win.destroy();
        });
        if (disposed) fn();
        else unlisten = fn;
      } catch (err) {
        console.warn("注册窗口关闭拦截失败(非 Tauri 上下文?):", err);
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t]);

  return (
    <>
      <WorkbenchLayout
        appVersion={appVersion}
        sidebar={
          rootPath && sidebarVisible ? (
            <FileTree
              key={treeVersion}
              rootPath={rootPath}
              activePath={effectiveActive ?? undefined}
              onOpenFile={openInFocused}
              actions={treeActions}
            />
          ) : undefined
        }
        menu={
          <MenuBar
            onOpen={open}
            onOpenFolder={openFolder}
            recentFiles={recent}
            onOpenRecent={openInFocused}
            onClearRecent={clearRecent}
            hasFolder={!!rootPath}
            onCloseFolder={closeFolder}
            onSave={doSave}
            onSaveAs={doSaveAs}
            canSave={!!effectiveActive}
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
              activePath={effectiveActive}
              onActivate={(p) =>
                focusedPane === "split" ? setSplitPath(p) : setActive(p)
              }
              onClose={closeTabSynced}
              onReorder={reorderTabs}
            />
          ) : null}
          <div className="flex min-h-0 flex-1">
            <div
              className="min-w-0 flex-1"
              onMouseDownCapture={() => setFocusedPane("main")}
            >
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
                        initialCursor={restoredCursorsRef.current[tab.path]}
                        extension={getFileExtension(tab.path)}
                        themeKind={activeTheme.kind}
                        settings={settings}
                        onDocChange={() => handleDocChange(tab.path)}
                      />
                    </div>
                  ))}
                </Suspense>
              ) : (
                <EmptyState />
              )}
            </div>
            {splitPath ? (
              <div
                className="min-w-0 flex-1 border-l border-[var(--color-border)]"
                onMouseDownCapture={() => setFocusedPane("split")}
              >
                <Suspense fallback={<div className="h-full w-full" />}>
                  <CodeEditor
                    key={splitPath}
                    ref={(instance) => {
                      if (instance) splitRefs.current.set(splitPath, instance);
                      else splitRefs.current.delete(splitPath);
                    }}
                    initialValue={
                      tabs.find((tb) => tb.path === splitPath)
                        ?.initialContent ?? ""
                    }
                    extension={getFileExtension(splitPath)}
                    themeKind={activeTheme.kind}
                    settings={settings}
                    onDocChange={() => handleDocChange(splitPath)}
                  />
                </Suspense>
              </div>
            ) : null}
            {previewOpen && activeIsMarkdown ? (
              <div className="min-w-0 flex-1 border-l border-[var(--color-border)]">
                <Suspense fallback={<div className="h-full w-full" />}>
                  <MarkdownPreview content={previewContent} />
                </Suspense>
              </div>
            ) : null}
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
        onOpenFile={openInFocused}
        onGoToLine={goToLine}
      />
      <SearchPanel
        open={searchOpen}
        onOpenChange={setSearchOpen}
        rootPath={rootPath}
        onOpenHit={openHit}
      />
      <AgentResultDialog result={agentResult} onClose={closeAgentResult} />
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
      <PromptDialog request={promptReq} onClose={() => setPromptReq(null)} />
    </>
  );
}

export default App;
