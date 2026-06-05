import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface AgentPanelMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  state?: "streaming" | "done" | "error";
}

interface AgentPanelProps {
  agentCmd: string;
  onAgentCmdChange: (value: string) => void;
  /** MCP server 配置(JSON 文本);转发给 agent 由其连接(ADR-0010)。 */
  mcpServersText: string;
  onMcpServersTextChange: (value: string) => void;
  /** MCP 配置解析错误(非 null 时红字提示,发送被拒)。 */
  mcpError: string | null;
  /** 已配置的 MCP server 数量(标题计数)。 */
  mcpCount: number;
  /** 当前对话消息。用户消息立即展示,assistant 消息按流式分块追加。 */
  messages: AgentPanelMessage[];
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
  mcpServersText,
  onMcpServersTextChange,
  mcpError,
  mcpCount,
  messages,
  busy,
  onSend,
  onClose,
}: AgentPanelProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const send = () => {
    const text = prompt.trim();
    if (!text || busy) return;
    onSend(text);
    setPrompt("");
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

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
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-[var(--color-muted)]">
            {t("agent.mcpLabel", { n: mcpCount })}
          </summary>
          <textarea
            className="mt-1 h-24 w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-[var(--color-text)] outline-none focus-visible:border-[var(--color-accent)]"
            value={mcpServersText}
            placeholder={
              '[{ "name": "fs", "command": "mcp-fs", "args": ["--stdio"], "env": [] }]'
            }
            onChange={(e) => onMcpServersTextChange(e.target.value)}
            spellCheck={false}
          />
          {mcpError ? (
            <p className="mt-1 text-xs text-red-400">
              {t("agent.mcpInvalid", { msg: mcpError })}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              {t("agent.mcpHint")}
            </p>
          )}
        </details>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="text-xs text-[var(--color-subtle)]">
            {t("agent.panelHint")}
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const isStreaming = message.state === "streaming";
              const displayText =
                message.text ||
                (isAssistant && isStreaming
                  ? t("agent.thinking")
                  : isAssistant
                    ? t("agent.emptyResponse")
                    : "");
              return (
                <article key={message.id} className="space-y-1">
                  <div className="text-[11px] font-medium text-[var(--color-muted)]">
                    {isAssistant
                      ? t("agent.assistantRole")
                      : t("agent.userRole")}
                  </div>
                  <pre
                    className={[
                      "rounded px-3 py-2 font-mono text-xs whitespace-pre-wrap",
                      isAssistant
                        ? "bg-[var(--color-bg)] text-[var(--color-text)]"
                        : "bg-[var(--color-overlay)] text-[var(--color-text)]",
                      message.state === "error"
                        ? "border border-red-400/60"
                        : "border border-transparent",
                    ].join(" ")}
                  >
                    {displayText}
                    {isAssistant && isStreaming ? (
                      <span className="text-[var(--color-subtle)]"> ▍</span>
                    ) : null}
                  </pre>
                </article>
              );
            })}
          </div>
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
