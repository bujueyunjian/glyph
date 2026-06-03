import { describe, expect, it } from "vitest";

import { getFileExtension, getFileName } from "@/utils/path";

describe("getFileName", () => {
  it("取 POSIX 路径的文件名", () => {
    expect(getFileName("/a/b/main.rs")).toBe("main.rs");
  });
  it("取 Windows 路径的文件名", () => {
    expect(getFileName("C:\\a\\b\\main.rs")).toBe("main.rs");
  });
  it("无分隔符时返回原串", () => {
    expect(getFileName("main.rs")).toBe("main.rs");
  });
  it("末尾分隔符回退到原串", () => {
    expect(getFileName("/a/b/")).toBe("/a/b/");
  });
});

describe("getFileExtension", () => {
  it("取小写扩展名", () => {
    expect(getFileExtension("/a/B/Main.RS")).toBe("rs");
  });
  it("多点取最后一段", () => {
    expect(getFileExtension("a.b.tsx")).toBe("tsx");
  });
  it("无扩展名返回空串", () => {
    expect(getFileExtension("Makefile")).toBe("");
  });
  it("点文件(如 .gitignore)不算扩展名", () => {
    expect(getFileExtension(".gitignore")).toBe("");
  });
});
