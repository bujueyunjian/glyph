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
import {
  createDir,
  createFile,
  deletePath,
  renamePath,
  takeLaunchFile,
} from "@/api/fileApi";
import { watchWorkspace } from "@/api/workspaceApi";
import { agentCancel, agentStream } from "@/api/agentApi";
import { CommandPalette } from "@/components/command/CommandPalette";
import { QuickOpen } from "@/components/command/QuickOpen";
import { SearchPanel } from "@/components/command/SearchPanel";
import { AgentPanel } from "@/components/command/AgentPanel";
import { OutlinePanel } from "@/components/command/OutlinePanel";
import { EditorContextMenu } from "@/components/editor/EditorContextMenu";
import { FileTree } from "@/components/explorer/FileTree";
import type { FileTreeActions } from "@/components/explorer/FileTreeNode";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import {
  PromptDialog,
  type PromptRequest,
} from "@/components/common/PromptDialog";
import { EmptyState } from "@/components/workbench/EmptyState";
import { MenuBar } from "@/components/workbench/MenuBar";
import { StatusBar } from "@/components/workbench/StatusBar";
import { TabBar } from "@/components/workbench/TabBar";
import { WorkbenchLayout } from "@/components/workbench/WorkbenchLayout";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { useRecentFolders } from "@/hooks/useRecentFolders";
import { useSession } from "@/hooks/useSession";
import { useLsp } from "@/hooks/useLsp";
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
import {
  toggleLinePrefix,
  toggleOrderedList,
  toggleWrap,
} from "@/features/markdown/mdFormat";
import { formatJson, minifyJson } from "@/features/textops/json";
import { countText } from "@/features/textops/textStats";
import type { LspEditorContext } from "@/features/lsp/editor";
import { languageIdForExtension } from "@/features/lsp/servers";
import {
  definitionTarget,
  offsetToPosition,
  outlineSymbols,
  referencesToHits,
  toCmChanges,
  workspaceEditChanges,
  type OutlineSymbol,
} from "@/features/lsp/protocol";
import { lspRequest } from "@/api/lspApi";
import type { SearchHit } from "@/types/searchTypes";
import { checkForUpdate } from "@/features/update/checkUpdate";
import {
  getDirName,
  getFileExtension,
  getFileName,
  joinPath,
} from "@/utils/path";

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
  // 同一文件主+分屏双开时记录"最近在哪个面板编辑过",保存按它取实例,
  // 确保写盘的是最新编辑(而非聚焦碰巧落在的、未编辑的另一面板的陈旧内容)。
  const lastEditedPaneRef = useRef<Map<string, "main" | "split">>(new Map());
  // 读某文件最新内容:优先最近编辑过的面板,其次聚焦面板,再回退另一面板。
  // 三级兜底避免读到陈旧/空内容 → 防覆盖丢数据。
  const getContent = useCallback((path: string) => {
    const edited = lastEditedPaneRef.current.get(path);
    const preferSplit =
      edited === "split" ||
      (edited === undefined && focusedPaneRef.current === "split");
    const order = preferSplit
      ? [splitRefs, editorRefs]
      : [editorRefs, splitRefs];
    for (const refs of order) {
      const view = refs.current.get(path)?.view;
      if (view) return view.state.doc.toString();
    }
    return "";
  }, []);

  // 拆分屏前把分屏实例内容写回主面板实例,使分屏拆除后主面板持最新内容(防丢编辑)。
  const syncSplitIntoMain = useCallback((path: string) => {
    const splitView = splitRefs.current.get(path)?.view;
    const mainView = editorRefs.current.get(path)?.view;
    if (!splitView || !mainView) return;
    const splitText = splitView.state.doc.toString();
    if (splitText === mainView.state.doc.toString()) return;
    mainView.dispatch({
      changes: { from: 0, to: mainView.state.doc.length, insert: splitText },
    });
    lastEditedPaneRef.current.set(path, "main");
  }, []);

  const { recent, addRecent, clearRecent } = useRecentFiles();
  const { recentFolders, addRecentFolder, clearRecentFolders } =
    useRecentFolders();
  const { settings, updateSetting, resetSettings } = useSettings();
  const {
    tabs,
    activePath,
    open,
    openPath,
    setActive,
    closeTab,
    closeOthers,
    closeAll,
    save,
    saveAs,
    saveAll,
    markDirty,
    reorderTabs,
  } = useEditorTabs(getContent, addRecent);
  const { themes, activeTheme, setTheme } = useTheme();
  const { rootPath, openFolder, openFolderPath, closeFolder } =
    useWorkspace(addRecentFolder);
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
  // 查找引用结果(非 null 时搜索面板进入覆盖模式展示引用,而非走搜索框)。
  const [referenceHits, setReferenceHits] = useState<SearchHit[] | null>(null);
  // 文档大纲面板:开关 + 当前文件符号 + 拉取中。
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineSyms, setOutlineSyms] = useState<OutlineSymbol[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const previewTimerRef = useRef<number | undefined>(undefined);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentCmd, setAgentCmd] = useState("claude-agent-acp");
  // 当前流式会话的 turn id(前端分配);事件按它过滤,杜绝旧会话残留串扰。
  const agentTurnRef = useRef<number | null>(null);
  const agentTurnCounter = useRef(0);

  const closeAgentPanel = useCallback(() => {
    const turn = agentTurnRef.current;
    if (turn !== null) void agentCancel(turn); // 终止后台子进程,不留孤儿
    agentTurnRef.current = null;
    setAgentBusy(false);
    setAgentPanelOpen(false);
  }, []);

  // 数据安全:首次运行 agent 前取得知情同意——提问会发给用户自配的 agent 及其模型方,
  // Glyph 仅本地转发、不存不传。一次性确认后持久化(localStorage),不反复打扰。
  const ensureAgentConsent = useCallback(async () => {
    if (localStorage.getItem("glyph.agentConsent") === "1") return true;
    const ok = await ask(t("agent.consentBody"), {
      title: t("agent.consentTitle"),
      kind: "warning",
    });
    if (ok) localStorage.setItem("glyph.agentConsent", "1");
    return ok;
  }, [t]);

  // 向 ACP agent 流式提问:先取知情同意,再取消上一会话、分配新 turn,响应分块按 turn 过滤追加。
  const askAgent = useCallback(
    (cmd: string, prompt: string) => {
      void (async () => {
        if (!(await ensureAgentConsent())) return; // 未同意则不发起,杜绝无意识的数据外发
        const prev = agentTurnRef.current;
        if (prev !== null) void agentCancel(prev);
        const turn = agentTurnCounter.current + 1;
        agentTurnCounter.current = turn;
        agentTurnRef.current = turn; // 先于发起设置,事件抵达即可匹配(无竞态丢块)
        setAgentResult(""); // 清空,等待流式分块
        setAgentBusy(true);
        void agentStream(cmd, prompt, turn).catch((err) => {
          if (agentTurnRef.current !== turn) return; // 已被取消/新会话取代
          agentTurnRef.current = null;
          setAgentBusy(false);
          toast.error(t("agent.failed", { msg: (err as Error).message }));
        });
      })();
    },
    [t, ensureAgentConsent],
  );

  // 常驻 agent 事件监听:按当前 turn 过滤,关闭后不复活对话框(prev===null 即忽略)。
  // 常驻(非每会话注册)→ 无监听泄漏、无 cleanup 时序竞态。
  useEffect(() => {
    let unlisten: (() => void)[] = [];
    let disposed = false;
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const subs = await Promise.all([
          listen<{ turnId: number; text: string }>("agent://chunk", (e) => {
            if (e.payload.turnId !== agentTurnRef.current) return;
            setAgentResult((prevText) =>
              prevText === null ? null : prevText + e.payload.text,
            );
          }),
          listen<{ turnId: number }>("agent://done", (e) => {
            if (e.payload.turnId === agentTurnRef.current) {
              agentTurnRef.current = null;
              setAgentBusy(false);
            }
          }),
          listen<{ turnId: number; message: string }>("agent://error", (e) => {
            if (e.payload.turnId !== agentTurnRef.current) return;
            agentTurnRef.current = null;
            setAgentBusy(false); // 保留已流式的部分,仅 toast 报错
            toast.error(t("agent.failed", { msg: e.payload.message }));
          }),
        ]);
        if (disposed) subs.forEach((u) => u());
        else unlisten = subs;
      } catch (err) {
        console.warn("注册 agent 事件监听失败(非 Tauri 上下文?):", err);
      }
    })();
    return () => {
      disposed = true;
      unlisten.forEach((u) => u());
    };
  }, [t]);
  const [splitPath, setSplitPath] = useState<string | null>(null);
  const [focusedPane, setFocusedPaneState] = useState<"main" | "split">("main");
  const setFocusedPane = useCallback((pane: "main" | "split") => {
    focusedPaneRef.current = pane;
    setFocusedPaneState(pane);
  }, []);
  // 聚焦面板的当前文件(save/undo/find/变换作用对象)。
  const effectiveActive = focusedPane === "split" ? splitPath : activePath;
  // 按当前文件语言自动连接语言服务器,状态栏显示连接态。
  const lspStatus = useLsp(effectiveActive, rootPath);
  // 接入聚焦编辑器的 LSP 上下文(memo 稳定,避免每渲染重挂 didOpen)。
  const lspCtx = useMemo<LspEditorContext | undefined>(() => {
    if (lspStatus.serverId == null || !effectiveActive) return undefined;
    return {
      serverId: lspStatus.serverId,
      uri: `file://${effectiveActive}`,
      languageId: languageIdForExtension(getFileExtension(effectiveActive)),
    };
  }, [lspStatus.serverId, effectiveActive]);

  const doSave = useCallback(() => {
    if (effectiveActive) void save(effectiveActive);
  }, [effectiveActive, save]);
  const doSaveAs = useCallback(() => {
    if (!effectiveActive) return;
    const old = effectiveActive;
    void saveAs(old).then((picked) => {
      if (!picked || picked === old) return;
      // 路径已变:同步 splitPath 与 last-edited 记录,避免指向不存在的旧路径(防悬空空写)。
      setSplitPath((cur) => (cur === old ? picked : cur));
      const pane = lastEditedPaneRef.current.get(old);
      lastEditedPaneRef.current.delete(old);
      if (pane) lastEditedPaneRef.current.set(picked, pane);
    });
  }, [effectiveActive, saveAs]);

  // 打开文件到聚焦面板:分屏聚焦则开进分屏(不动主面板激活),否则开进主面板。
  const openInFocused = useCallback(
    (path: string) => {
      if (focusedPaneRef.current === "split") {
        // 仅在成功打开(标签确已存在)后才指向分屏,避免失败时 splitPath 悬空 → 空写覆盖。
        void openPath(path, false).then((ok) => {
          if (ok) setSplitPath(path);
        });
      } else {
        void openPath(path);
      }
    },
    [openPath],
  );

  // 切换分屏:已开则关(关前把分屏编辑写回主面板,防丢),否则把当前文件开进分屏。
  const toggleSplit = useCallback(() => {
    if (splitPath !== null) {
      syncSplitIntoMain(splitPath);
      setSplitPath(null);
      setFocusedPane("main");
    } else if (activePath !== null) {
      setSplitPath(activePath);
    }
  }, [splitPath, activePath, setFocusedPane, syncSplitIntoMain]);

  // 关闭标签并同步:若该文件正在分屏显示,一并关掉分屏视图。
  const closeTabSynced = useCallback(
    (path: string) => {
      closeTab(path); // closeTab 内部经 getContent 取最新内容做撤销快照
      lastEditedPaneRef.current.delete(path);
      setSplitPath((cur) => (cur === path ? null : cur));
    },
    [closeTab],
  );

  // 关闭其他/全部标签:同步清理悬空的分屏视图。
  const doCloseOthers = useCallback(() => {
    if (!effectiveActive) return;
    closeOthers(effectiveActive);
    setSplitPath((cur) => (cur === effectiveActive ? cur : null));
  }, [closeOthers, effectiveActive]);
  const doCloseAll = useCallback(() => {
    closeAll();
    setSplitPath(null);
  }, [closeAll]);

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

  // 打开跨文件搜索(清掉引用覆盖,确保进的是普通搜索而非上次的引用结果)。
  const openSearch = useCallback(() => {
    setReferenceHits(null);
    setSearchOpen(true);
  }, []);

  // 右键剪贴板:经聚焦编辑器读写系统剪贴板,粘贴/剪切经 CM dispatch 以走撤销栈。
  const clipboardFailed = useCallback(
    (err: unknown) =>
      toast.error(t("edit.clipboardFailed", { msg: (err as Error).message })),
    [t],
  );
  const editorCopy = useCallback(() => {
    const view = activeView();
    if (!view) return;
    const { from, to } = view.state.selection.main;
    if (from === to) return;
    navigator.clipboard
      .writeText(view.state.sliceDoc(from, to))
      .catch(clipboardFailed);
  }, [activeView, clipboardFailed]);
  const editorCut = useCallback(() => {
    const view = activeView();
    if (!view) return;
    const { from, to } = view.state.selection.main;
    if (from === to) return;
    navigator.clipboard
      .writeText(view.state.sliceDoc(from, to))
      .then(() => {
        view.dispatch({ changes: { from, to, insert: "" } });
        view.focus();
      })
      .catch(clipboardFailed);
  }, [activeView, clipboardFailed]);
  const editorPaste = useCallback(() => {
    const view = activeView();
    if (!view) return;
    navigator.clipboard
      .readText()
      .then((text) => {
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      })
      .catch(clipboardFailed);
  }, [activeView, clipboardFailed]);

  // 行编辑动词(注释/移动/复制/删除行):复用 CodeMirror 内置命令,经命令面板暴露
  // 以便发现(快捷键由 basicSetup 的 defaultKeymap 已绑定)。动态 import 不进首屏。
  const runLineCommand = useCallback(
    async (
      name:
        | "toggleComment"
        | "moveLineUp"
        | "moveLineDown"
        | "copyLineDown"
        | "deleteLine",
    ) => {
      const view = activeView();
      if (!view) return;
      const cmds = await import("@codemirror/commands");
      const command = {
        toggleComment: cmds.toggleComment,
        moveLineUp: cmds.moveLineUp,
        moveLineDown: cmds.moveLineDown,
        copyLineDown: cmds.copyLineDown,
        deleteLine: cmds.deleteLine,
      }[name];
      command(view);
      view.focus();
    },
    [activeView],
  );

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

  // Markdown 行内格式化:对每个选区切换环绕标记(粗体/斜体/码/删除线);空选区成对插入。
  const formatInline = useCallback(
    (marker: string) => {
      const view = activeView();
      if (!view) return;
      const { state } = view;
      const changes = state.selection.ranges.map((range) => ({
        from: range.from,
        to: range.to,
        insert: toggleWrap(state.doc.sliceString(range.from, range.to), marker),
      }));
      view.dispatch({ changes });
      view.focus();
    },
    [activeView],
  );

  // 整篇变换(如 JSON 美化/压缩):替换全文;转换抛错则红 toast(失败响亮,不改文档)。
  const transformWholeDoc = useCallback(
    (fn: (text: string) => string, errorKey: string) => {
      const view = activeView();
      if (!view) return;
      try {
        const next = fn(view.state.doc.toString());
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: next },
        });
        view.focus();
      } catch (err) {
        toast.error(t(errorKey, { msg: (err as Error).message }));
      }
    },
    [activeView, t],
  );

  // 字数统计:对聚焦文件全文计数,经 toast 展示(按需,不进打字热路径)。
  const showWordCount = useCallback(() => {
    if (!effectiveActive) return;
    const { words, chars, lines } = countText(getContent(effectiveActive));
    toast(t("textops.wordCountResult", { words, chars, lines }));
  }, [effectiveActive, getContent, t]);

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

  // 转到定义:对聚焦编辑器光标处请求 definition,打开目标文件并跳转(复用 openHit)。
  const goToDefinition = useCallback(async () => {
    const view = activeView();
    if (!view || lspStatus.serverId == null || !effectiveActive) return;
    let result: unknown;
    try {
      result = await lspRequest(lspStatus.serverId, "textDocument/definition", {
        textDocument: { uri: `file://${effectiveActive}` },
        position: offsetToPosition(
          view.state.doc,
          view.state.selection.main.head,
        ),
      });
    } catch {
      return;
    }
    const target = definitionTarget(result);
    if (target) openHit(target.path, target.line + 1); // LSP 0 基行 → openHit 1 基
  }, [activeView, lspStatus.serverId, effectiveActive, openHit]);

  // 查找引用:请求 LSP references,把命中喂给搜索面板覆盖模式展示(点击跳转)。
  const doFindReferences = useCallback(async () => {
    const view = activeView();
    if (!view || lspStatus.serverId == null || !effectiveActive) return;
    let result: unknown;
    try {
      result = await lspRequest(lspStatus.serverId, "textDocument/references", {
        textDocument: { uri: `file://${effectiveActive}` },
        position: offsetToPosition(
          view.state.doc,
          view.state.selection.main.head,
        ),
        context: { includeDeclaration: true },
      });
    } catch (err) {
      toast.error(t("lsp.referencesFailed", { msg: (err as Error).message }));
      return;
    }
    const hits = referencesToHits(result, rootPath);
    if (hits.length === 0) {
      toast(t("lsp.referencesNone"));
      return;
    }
    setReferenceHits(hits);
    setSearchOpen(true);
  }, [activeView, lspStatus.serverId, effectiveActive, rootPath, t]);

  // 把 TextEdit 应用到某文件:打开它,轮询等实例就绪后排序 dispatch(应对懒加载时序)。
  const applyEditsToFile = useCallback(
    (path: string, edits: unknown[]) => {
      void openPath(path);
      let tries = 0;
      const apply = () => {
        const view = editorRefs.current.get(path)?.view;
        if (view) {
          const changes = toCmChanges(edits, view.state.doc).sort(
            (a, b) => a.from - b.from,
          );
          if (changes.length) view.dispatch({ changes });
        } else if (tries++ < 20) {
          setTimeout(apply, 50);
        }
      };
      setTimeout(apply, 50);
    },
    [openPath],
  );

  // 重命名符号:请求 LSP rename,把 WorkspaceEdit 应用到每个受影响文件(自动打开)。
  const doRename = useCallback(() => {
    const view = activeView();
    if (!view || lspStatus.serverId == null || !effectiveActive) return;
    const serverId = lspStatus.serverId;
    const uri = `file://${effectiveActive}`;
    const position = offsetToPosition(
      view.state.doc,
      view.state.selection.main.head,
    );
    setPromptReq({
      title: t("lsp.rename"),
      fields: [{ key: "name", label: t("lsp.renameLabel") }],
      onSubmit: (v) => {
        const newName = v.name?.trim();
        if (!newName) return;
        void (async () => {
          let result: unknown;
          try {
            result = await lspRequest(serverId, "textDocument/rename", {
              textDocument: { uri },
              position,
              newName,
            });
          } catch (err) {
            toast.error(t("lsp.renameFailed", { msg: (err as Error).message }));
            return;
          }
          const files = workspaceEditChanges(result);
          if (files.length === 0) {
            toast(t("lsp.renameNone"));
            return;
          }
          for (const fe of files) applyEditsToFile(fe.path, fe.edits);
          toast.success(t("lsp.renameDone", { count: files.length }));
        })();
      },
    });
  }, [activeView, lspStatus.serverId, effectiveActive, applyEditsToFile, t]);

  // 格式化文档:请求 LSP formatting,把 TextEdit 一次性 dispatch(排序防 CM 报错)。
  const doFormatDocument = useCallback(async () => {
    const view = activeView();
    if (!view || lspStatus.serverId == null || !effectiveActive) return;
    let result: unknown;
    try {
      result = await lspRequest(lspStatus.serverId, "textDocument/formatting", {
        textDocument: { uri: `file://${effectiveActive}` },
        options: {
          tabSize: settings.tabSize,
          insertSpaces: settings.insertSpaces,
        },
      });
    } catch {
      return;
    }
    const changes = toCmChanges(result, view.state.doc).sort(
      (a, b) => a.from - b.from,
    );
    if (changes.length) view.dispatch({ changes });
    view.focus();
  }, [
    activeView,
    lspStatus.serverId,
    effectiveActive,
    settings.tabSize,
    settings.insertSpaces,
  ]);

  // 文档大纲:面板开启 + 有聚焦文件 + 语言服务器就绪时拉取符号(切文件自动刷新)。
  // 只在打开/切文件时拉,不挂打字热路径(符号变更靠重开或切换刷新,守延迟高线)。
  useEffect(() => {
    if (!outlineOpen || lspStatus.serverId == null || !effectiveActive) {
      setOutlineSyms([]);
      return;
    }
    let cancelled = false;
    setOutlineLoading(true);
    void lspRequest(lspStatus.serverId, "textDocument/documentSymbol", {
      textDocument: { uri: `file://${effectiveActive}` },
    })
      .then((result) => {
        if (!cancelled) setOutlineSyms(outlineSymbols(result));
      })
      .catch(() => {
        if (!cancelled) setOutlineSyms([]);
      })
      .finally(() => {
        if (!cancelled) setOutlineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [outlineOpen, lspStatus.serverId, effectiveActive]);

  // 检查更新:比对 GitHub 最新发布,有则提示并可跳下载页(不自动装,那需签名/证书)。
  const doCheckUpdate = useCallback(async () => {
    if (!appVersion) {
      toast.error(t("update.unknownVersion"));
      return;
    }
    toast(t("update.checking"));
    try {
      const info = await checkForUpdate(appVersion);
      if (info.available) {
        toast(t("update.available", { version: info.latest }), {
          action: {
            label: t("update.download"),
            onClick: () =>
              void import("@tauri-apps/plugin-opener").then((m) =>
                m.openUrl(info.url),
              ),
          },
        });
      } else {
        toast.success(t("update.upToDate", { version: appVersion }));
      }
    } catch (err) {
      toast.error(t("update.failed", { msg: (err as Error).message }));
    }
  }, [appVersion, t]);

  // 编辑回调:标脏 + (预览开启时)防抖刷新 Markdown 预览内容(不阻塞打字热路径)。
  const handleDocChange = useCallback(
    (path: string, pane: "main" | "split") => {
      lastEditedPaneRef.current.set(path, pane); // 记录最近编辑面板,保存取对实例
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
  // 聚焦文件是否 Markdown:决定格式化命令是否进命令面板(上下文相关,保持面板克制)。
  const effectiveIsMarkdown =
    !!effectiveActive &&
    ["md", "markdown"].includes(getFileExtension(effectiveActive));
  const effectiveIsJson =
    !!effectiveActive &&
    ["json", "jsonc"].includes(getFileExtension(effectiveActive));

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
        id: "file.saveAll",
        title: t("file.saveAll"),
        group: t("menu.file"),
        shortcut: "Ctrl/⌘ ⌥ S",
        perform: () => void saveAll(),
      },
      ...(tabs.length > 1
        ? [
            {
              id: "file.closeOthers",
              title: t("file.closeOthers"),
              group: t("menu.file"),
              perform: doCloseOthers,
            },
          ]
        : []),
      ...(tabs.length > 0
        ? [
            {
              id: "file.closeAll",
              title: t("file.closeAll"),
              group: t("menu.file"),
              perform: doCloseAll,
            },
          ]
        : []),
      {
        id: "view.settings",
        title: t("settings.title"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ ,",
        perform: () => setSettingsOpen(true),
      },
      {
        id: "view.outline",
        title: t("outline.title"),
        group: t("menu.view"),
        shortcut: "Ctrl/⌘ ⇧ O",
        perform: () => setOutlineOpen((prev) => !prev),
      },
      {
        id: "search.files",
        title: t("search.title"),
        group: t("menu.edit"),
        shortcut: "Ctrl/⌘ ⇧ F",
        perform: openSearch,
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
        perform: () => setAgentPanelOpen(true),
      },
      {
        id: "edit.toggleComment",
        title: t("edit.toggleComment"),
        group: t("menu.edit"),
        shortcut: "Ctrl/⌘ /",
        perform: () => void runLineCommand("toggleComment"),
      },
      {
        id: "edit.moveLineUp",
        title: t("edit.moveLineUp"),
        group: t("menu.edit"),
        shortcut: "Alt ↑",
        perform: () => void runLineCommand("moveLineUp"),
      },
      {
        id: "edit.moveLineDown",
        title: t("edit.moveLineDown"),
        group: t("menu.edit"),
        shortcut: "Alt ↓",
        perform: () => void runLineCommand("moveLineDown"),
      },
      {
        id: "edit.duplicateLine",
        title: t("edit.duplicateLine"),
        group: t("menu.edit"),
        shortcut: "Shift Alt ↓",
        perform: () => void runLineCommand("copyLineDown"),
      },
      {
        id: "edit.deleteLine",
        title: t("edit.deleteLine"),
        group: t("menu.edit"),
        shortcut: "Ctrl/⌘ ⇧ K",
        perform: () => void runLineCommand("deleteLine"),
      },
      ...(lspStatus.serverId != null
        ? [
            {
              id: "lsp.goToDefinition",
              title: t("lsp.goToDefinition"),
              group: t("menu.edit"),
              shortcut: "F12",
              perform: () => void goToDefinition(),
            },
            {
              id: "lsp.findReferences",
              title: t("lsp.findReferences"),
              group: t("menu.edit"),
              shortcut: "Shift F12",
              perform: () => void doFindReferences(),
            },
            {
              id: "lsp.format",
              title: t("lsp.format"),
              group: t("menu.edit"),
              shortcut: "Shift Alt F",
              perform: () => void doFormatDocument(),
            },
            {
              id: "lsp.rename",
              title: t("lsp.rename"),
              group: t("menu.edit"),
              shortcut: "F2",
              perform: doRename,
            },
          ]
        : []),
      {
        id: "textops.wordCount",
        title: t("textops.wordCount"),
        group: t("textops.group"),
        perform: showWordCount,
      },
      ...(effectiveIsJson
        ? [
            {
              id: "json.format",
              title: t("json.format"),
              group: t("json.group"),
              perform: () =>
                transformWholeDoc((s) => formatJson(s), "json.invalid"),
            },
            {
              id: "json.minify",
              title: t("json.minify"),
              group: t("json.group"),
              perform: () => transformWholeDoc(minifyJson, "json.invalid"),
            },
          ]
        : []),
      ...(effectiveIsMarkdown
        ? [
            {
              id: "mdfmt.bold",
              title: t("mdfmt.bold"),
              group: t("mdfmt.group"),
              perform: () => formatInline("**"),
            },
            {
              id: "mdfmt.italic",
              title: t("mdfmt.italic"),
              group: t("mdfmt.group"),
              perform: () => formatInline("*"),
            },
            {
              id: "mdfmt.code",
              title: t("mdfmt.code"),
              group: t("mdfmt.group"),
              perform: () => formatInline("`"),
            },
            {
              id: "mdfmt.strike",
              title: t("mdfmt.strike"),
              group: t("mdfmt.group"),
              perform: () => formatInline("~~"),
            },
            {
              id: "mdfmt.h1",
              title: t("mdfmt.h1"),
              group: t("mdfmt.group"),
              perform: () => transformLines((s) => toggleLinePrefix(s, "# ")),
            },
            {
              id: "mdfmt.h2",
              title: t("mdfmt.h2"),
              group: t("mdfmt.group"),
              perform: () => transformLines((s) => toggleLinePrefix(s, "## ")),
            },
            {
              id: "mdfmt.quote",
              title: t("mdfmt.quote"),
              group: t("mdfmt.group"),
              perform: () => transformLines((s) => toggleLinePrefix(s, "> ")),
            },
            {
              id: "mdfmt.bullet",
              title: t("mdfmt.bullet"),
              group: t("mdfmt.group"),
              perform: () => transformLines((s) => toggleLinePrefix(s, "- ")),
            },
            {
              id: "mdfmt.ordered",
              title: t("mdfmt.ordered"),
              group: t("mdfmt.group"),
              perform: () => transformLines(toggleOrderedList),
            },
          ]
        : []),
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
      {
        id: "update.check",
        title: t("update.check"),
        group: t("menu.help"),
        perform: () => void doCheckUpdate(),
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
      saveAll,
      tabs.length,
      doCloseOthers,
      doCloseAll,
      themes,
      setTheme,
      transformLines,
      toggleSplit,
      effectiveIsMarkdown,
      effectiveIsJson,
      formatInline,
      runLineCommand,
      showWordCount,
      transformWholeDoc,
      lspStatus.serverId,
      goToDefinition,
      doFindReferences,
      doFormatDocument,
      doRename,
      doCheckUpdate,
      openSearch,
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
      // F12 转到定义 / Shift+F12 查找引用(非 ctrl/meta 键,早返回)。
      if (event.key === "F12" && lspStatus.serverId != null) {
        event.preventDefault();
        if (event.shiftKey) void doFindReferences();
        else void goToDefinition();
        return;
      }
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
        setReferenceHits(null);
        setSearchOpen((prev) => !prev);
      } else if (event.shiftKey && key === "v") {
        event.preventDefault();
        setPreviewOpen((prev) => !prev);
      } else if (event.shiftKey && key === "o") {
        event.preventDefault();
        setOutlineOpen((prev) => !prev);
      } else if (key === "o") {
        event.preventDefault();
        void open();
      } else if (key === "s") {
        event.preventDefault();
        if (event.altKey) void saveAll();
        else if (event.shiftKey) doSaveAs();
        else doSave();
      } else if (key === "w") {
        if (effectiveActive) {
          event.preventDefault();
          if (focusedPane === "split" && splitPath) {
            syncSplitIntoMain(splitPath); // 关分屏前把编辑写回主面板,防丢
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
    saveAll,
    closeTabSynced,
    activePath,
    effectiveActive,
    focusedPane,
    splitPath,
    syncSplitIntoMain,
    toggleSplit,
    setFocusedPane,
    lspStatus.serverId,
    goToDefinition,
    doFindReferences,
  ]);

  // 会话恢复:启动时一次,打开上次会话的文件(缺=空态;坏 JSON 已在 loadSession 响亮报错)。
  const restoreStarted = useRef(false);
  const restoreDone = useRef(false);
  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    const session = loadSession();
    if (session?.cursors) restoredCursorsRef.current = session.cursors;
    // 重开上次工作区文件夹(启动连续性);路径已不存在时文件树会响亮报错。
    if (session?.rootPath) openFolderPath(session.rootPath);
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
  }, [loadSession, openPath, openFolderPath]);

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
    // 分屏中文件的光标取自分屏实例(主面板的同名实例未被在分屏中编辑)。
    if (splitPath) {
      const splitHead =
        splitRefs.current.get(splitPath)?.view?.state.selection.main.head;
      if (splitHead != null) cursors[splitPath] = splitHead;
    }
    saveSession(
      tabs.map((tab) => tab.path),
      activePath,
      cursors,
      rootPath,
    );
  }, [tabs, activePath, splitPath, rootPath, saveSession]);

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

  // 「用 Glyph 打开」:冷启动从启动参数取文件 + 运行时监听 open-external-file 事件。
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      try {
        const pending = await takeLaunchFile();
        if (pending && !disposed) openInFocused(pending);
        const { listen } = await import("@tauri-apps/api/event");
        const fn = await listen<string>("open-external-file", (event) => {
          openInFocused(event.payload);
        });
        if (disposed) fn();
        else unlisten = fn;
      } catch (err) {
        console.warn("处理外部打开文件失败(非 Tauri 上下文?):", err);
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [openInFocused]);

  return (
    <>
      <WorkbenchLayout
        statusBar={
          <StatusBar
            appVersion={appVersion}
            fileName={
              effectiveActive ? getFileName(effectiveActive) : undefined
            }
            language={
              effectiveActive ? getFileExtension(effectiveActive) : undefined
            }
            lsp={lspStatus}
          />
        }
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
            recentFolders={recentFolders}
            onOpenRecentFolder={openFolderPath}
            onClearRecentFolders={clearRecentFolders}
            hasFolder={!!rootPath}
            onCloseFolder={closeFolder}
            onSave={doSave}
            onSaveAs={doSaveAs}
            canSave={!!effectiveActive}
            onUndo={editorUndo}
            onRedo={editorRedo}
            onFind={editorFind}
            onSearchInFiles={openSearch}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
            onToggleSplit={toggleSplit}
            onToggleOutline={() => setOutlineOpen((prev) => !prev)}
            onCommandPalette={() => setPaletteOpen(true)}
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
            <EditorContextMenu
              lspReady={lspStatus.state === "ready"}
              onCut={editorCut}
              onCopy={editorCopy}
              onPaste={editorPaste}
              onFind={() => void editorFind()}
              onGoToDefinition={() => void goToDefinition()}
              onFindReferences={() => void doFindReferences()}
              onRename={doRename}
              onFormat={() => void doFormatDocument()}
              onCommandPalette={() => setPaletteOpen(true)}
            >
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
                          lsp={
                            focusedPane === "main" &&
                            tab.path === effectiveActive
                              ? lspCtx
                              : undefined
                          }
                          onDocChange={() => handleDocChange(tab.path, "main")}
                        />
                      </div>
                    ))}
                  </Suspense>
                ) : (
                  <EmptyState />
                )}
              </div>
            </EditorContextMenu>
            {splitPath ? (
              <EditorContextMenu
                lspReady={lspStatus.state === "ready"}
                onCut={editorCut}
                onCopy={editorCopy}
                onPaste={editorPaste}
                onFind={() => void editorFind()}
                onGoToDefinition={() => void goToDefinition()}
                onFindReferences={() => void doFindReferences()}
                onRename={doRename}
                onFormat={() => void doFormatDocument()}
                onCommandPalette={() => setPaletteOpen(true)}
              >
                <div
                  className="min-w-0 flex-1 border-l border-[var(--color-border)]"
                  onMouseDownCapture={() => setFocusedPane("split")}
                >
                  <Suspense fallback={<div className="h-full w-full" />}>
                    <CodeEditor
                      key={splitPath}
                      ref={(instance) => {
                        if (instance)
                          splitRefs.current.set(splitPath, instance);
                        else splitRefs.current.delete(splitPath);
                      }}
                      initialValue={
                        tabs.find((tb) => tb.path === splitPath)
                          ?.initialContent ?? ""
                      }
                      extension={getFileExtension(splitPath)}
                      themeKind={activeTheme.kind}
                      settings={settings}
                      lsp={focusedPane === "split" ? lspCtx : undefined}
                      onDocChange={() => handleDocChange(splitPath, "split")}
                    />
                  </Suspense>
                </div>
              </EditorContextMenu>
            ) : null}
            {previewOpen && activeIsMarkdown ? (
              <div className="min-w-0 flex-1 border-l border-[var(--color-border)]">
                <Suspense fallback={<div className="h-full w-full" />}>
                  <MarkdownPreview content={previewContent} />
                </Suspense>
              </div>
            ) : null}
            {agentPanelOpen ? (
              <AgentPanel
                agentCmd={agentCmd}
                onAgentCmdChange={setAgentCmd}
                result={agentResult}
                busy={agentBusy}
                onSend={(prompt) => askAgent(agentCmd, prompt)}
                onClose={closeAgentPanel}
              />
            ) : null}
            {outlineOpen ? (
              <OutlinePanel
                symbols={outlineSyms}
                loading={outlineLoading}
                hasLsp={lspStatus.serverId != null}
                onGoToLine={(line) => goToLine(line + 1)}
                onClose={() => setOutlineOpen(false)}
              />
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
        lspServerId={lspStatus.serverId}
        activeUri={effectiveActive ? `file://${effectiveActive}` : undefined}
        onOpenFile={openInFocused}
        onGoToLine={goToLine}
      />
      <SearchPanel
        open={searchOpen}
        onOpenChange={(next) => {
          setSearchOpen(next);
          if (!next) setReferenceHits(null); // 关闭即退出引用覆盖模式
        }}
        rootPath={rootPath}
        onOpenHit={openHit}
        overrideHits={referenceHits}
        overrideTitle={t("lsp.referencesTitle")}
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
      <PromptDialog request={promptReq} onClose={() => setPromptReq(null)} />
    </>
  );
}

export default App;
