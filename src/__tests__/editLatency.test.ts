import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

// 键入延迟门禁(文档模型层)。把「延迟即产品」红线变成可执行 CI 检查:
// CodeMirror 用增量事务,单次编辑成本应与文档规模无关。若有人引入「每键扫全文」
// 的 O(doc) 退化(违反红线「每键不得让整篇文档过 React state / 热路径」),大文档
// 每次编辑会显著变慢,本测试即报警。
//
// 用「大文档 / 小文档 每次编辑耗时比」而非绝对毫秒断言 —— 对 CI 机器速度不敏感,
// 只在出现数量级退化时失败。注意:本门禁覆盖文档模型热路径,不含 React 渲染 / 绘制
// (那部分需显示环境实测,见 PROGRESS「下一步」)。

// 在指定行数的文档上连续追加单字符,返回每次编辑平均耗时(毫秒)。
function measureEditCost(lineCount: number, edits: number): number {
  const doc = Array.from(
    { length: lineCount },
    (_, i) => `line ${i} some representative source content here`,
  ).join("\n");
  let state = EditorState.create({ doc });

  const start = performance.now();
  for (let i = 0; i < edits; i += 1) {
    state = state.update({
      changes: { from: state.doc.length, insert: "x" },
    }).state;
  }
  return (performance.now() - start) / edits;
}

describe("键入延迟红线(文档模型)", () => {
  it("单次编辑成本与文档规模无关(增量事务,无 O(doc) 退化)", () => {
    // 预热:抹平 JIT / 首次分配抖动,使后续计时稳定。
    measureEditCost(1000, 500);

    const smallDoc = measureEditCost(200, 4000);
    const largeDoc = measureEditCost(50_000, 4000);

    // 大文档比小文档慢属正常(缓存/分配差异),但绝不应数量级放大。
    // 8 倍 + 0.5ms 地板:增量编辑远在其下,O(doc) 退化(几十倍以上)必触发。
    expect(largeDoc).toBeLessThan(smallDoc * 8 + 0.5);
  });
});
