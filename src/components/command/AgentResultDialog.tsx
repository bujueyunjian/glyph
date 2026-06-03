import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AgentResultDialogProps {
  result: string | null;
  onClose: () => void;
}

// 展示 ACP agent 的一次性响应(只读,可滚动)。属 M4 实验性 in-editor AI(见 ADR-0007/0008)。
export function AgentResultDialog({ result, onClose }: AgentResultDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root
      open={result !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[70vh] w-[640px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-[var(--color-text)]">
              {t("agent.resultTitle")}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
              aria-label={t("common.cancel")}
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {t("agent.resultTitle")}
          </Dialog.Description>
          <pre className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-xs whitespace-pre-wrap text-[var(--color-text)]">
            {result}
          </pre>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
