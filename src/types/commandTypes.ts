// 命令面板里的一条可执行命令。
export interface CommandAction {
  /** 稳定唯一 id(也用于模糊匹配关键词)。 */
  id: string;
  /** 显示标题(已 i18n)。 */
  title: string;
  /** 所属分组(已 i18n),如"文件"/"视图"。 */
  group: string;
  /** 内联展示的快捷键提示(可选)。 */
  shortcut?: string;
  /** 选中执行。 */
  perform: () => void;
}
