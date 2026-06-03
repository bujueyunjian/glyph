import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readJson, writeJson } from "@/utils/storage";

// 内存版 localStorage,避免为单测引入 jsdom 依赖。
function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  const mock: Partial<Storage> = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  return mock as Storage;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createLocalStorageMock());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("readJson", () => {
  it("缺(键不存在)→ value=null、corrupted=false", () => {
    expect(readJson("missing")).toEqual({ value: null, corrupted: false });
  });

  it("正常 JSON → 解析出值", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    expect(readJson<{ a: number }>("k")).toEqual({
      value: { a: 1 },
      corrupted: false,
    });
  });

  it("坏 JSON → value=null、corrupted=true(不静默当默认值)", () => {
    localStorage.setItem("k", "{bad json");
    expect(readJson("k")).toEqual({ value: null, corrupted: true });
  });
});

describe("writeJson", () => {
  it("写入的值可被 readJson 读回", () => {
    writeJson("k", [1, 2, 3]);
    expect(readJson<number[]>("k").value).toEqual([1, 2, 3]);
  });

  it("写入失败仅 warn 不抛(隐私模式/配额)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage);
    expect(() => writeJson("k", { a: 1 })).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
