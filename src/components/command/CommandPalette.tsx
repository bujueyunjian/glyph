import { useMemo } from "react";
import { Command } from "cmdk";
import { useTranslation } from "react-i18next";

import type { CommandAction } from "@/types/commandTypes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandAction[];
}

// 命令面板:"一个栏去任何地方"的命令侧(设计准则 #3)。
// 基于 cmdk(模糊搜索 + 键盘可达),样式在 styles.css 用主题 token 定制(跟随明暗)。
export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  const { t } = useTranslation();

  // 按 group 分组并保持插入顺序。
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, CommandAction[]>();
    for (const cmd of commands) {
      if (!byGroup.has(cmd.group)) {
        byGroup.set(cmd.group, []);
        order.push(cmd.group);
      }
      byGroup.get(cmd.group)!.push(cmd);
    }
    return order.map((group) => ({ group, items: byGroup.get(group)! }));
  }, [commands]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("command.title")}
    >
      <Command.Input placeholder={t("command.placeholder")} />
      <Command.List>
        <Command.Empty>{t("command.empty")}</Command.Empty>
        {groups.map(({ group, items }) => (
          <Command.Group key={group} heading={group}>
            {items.map((cmd) => (
              <Command.Item
                key={cmd.id}
                value={`${cmd.title} ${cmd.group} ${cmd.id}`}
                onSelect={() => {
                  onOpenChange(false);
                  cmd.perform();
                }}
              >
                <span>{cmd.title}</span>
                {cmd.shortcut ? (
                  <span className="text-xs text-[var(--color-subtle)]">
                    {cmd.shortcut}
                  </span>
                ) : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
