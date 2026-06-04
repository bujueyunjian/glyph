import { useState } from "react";
import { Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AgentPanelProps {
  agentCmd: string;
  onAgentCmdChange: (value: string) => void;
  /** 流式响应文本(null = 尚无;"" = 已开始,等待分块)。 */
  result: string | null;
  /** 是否有进行中的会话(展示加载态/禁用发送)。 */
  busy: boolean;
  onSend: (prompt: string) => void;
  onClose: () => void;
}

// AI Agent 侧栏:配置适配器命令、内联输入追问、流式查看响应(M4 支柱③ in-editor AI)。
// 不自建模型/不绑 key —— 接用户已装的 ACP 适配器(见 ADR-0004/0007/0008)。
export function AgentPanel({
  agentCmd,
  onAgentCmdChange,
  result,
  busy,
  onSend,
  onClose,
}: AgentPanelProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");

  const send = () => {
    const text = prompt.trim();
    if (!text || busy) return;
    onSend(text);
    setPrompt("");
  };

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--color-text)]">
          {t("agent.panelTitle")}
        </span>
        <button
          type="button"
          className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
          onClick={onClose}
          aria-label={t("common.cancel")}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          {t("agent.cmdLabel")}
        </label>
        <input
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)] outline-none focus-visible:border-[var(--color-accent)]"
          value={agentCmd}
          onChange={(e) => onAgentCmdChange(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
        {result === null ? (
          <p className="text-xs text-[var(--color-subtle)]">
            {t("agent.panelHint")}
          </p>
        ) : (
          <pre className="font-mono text-xs whitespace-pre-wrap text-[var(--color-text)]">
            {result}
            {busy ? (
              <span className="text-[var(--color-subtle)]"> ▍</span>
            ) : null}
          </pre>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="min-h-9 max-h-32 flex-1 resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)] outline-none focus-visible:border-[var(--color-accent)]"
            rows={2}
            value={prompt}
            placeholder={t("agent.promptLabel")}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            className="rounded bg-[var(--color-accent)] p-2 text-white disabled:opacity-40"
            onClick={send}
            disabled={busy || prompt.trim() === ""}
            aria-label={t("agent.send")}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
