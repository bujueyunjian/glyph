import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";

export interface PromptField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

export interface PromptRequest {
  title: string;
  fields: PromptField[];
  onSubmit: (values: Record<string, string>) => void;
}

interface PromptDialogProps {
  request: PromptRequest | null;
  onClose: () => void;
}

const inputClass =
  "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-subtle)]";

// 通用输入对话框:命令面板动词需要参数时用(如行变换的前缀/后缀)。Radix Dialog,跟随主题。
export function PromptDialog({ request, onClose }: PromptDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(
      request
        ? Object.fromEntries(
            request.fields.map((f) => [f.key, f.defaultValue ?? ""]),
          )
        : {},
    );
  }, [request]);

  if (!request) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[400px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <Dialog.Title className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text)]">
            {request.title}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {request.title}
          </Dialog.Description>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              request.onSubmit(values);
              onClose();
            }}
          >
            <div className="flex flex-col gap-3 px-4 py-4">
              {request.fields.map((field, index) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-muted)]">
                    {field.label}
                  </span>
                  <input
                    autoFocus={index === 0}
                    className={inputClass}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm text-[var(--color-bg)]"
              >
                {t("common.confirm")}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
