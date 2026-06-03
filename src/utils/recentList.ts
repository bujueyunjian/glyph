// 最近列表更新:新项置顶、去重、限长。纯函数,最近文件 / 最近文件夹历史共用。
export function pushRecent(
  list: readonly string[],
  item: string,
  max: number,
): string[] {
  return [item, ...list.filter((entry) => entry !== item)].slice(0, max);
}
