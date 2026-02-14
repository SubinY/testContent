import type { GeneratedTest } from "@/types";

const TEST_CACHE_KEY = "testflow.cache.v1";
const LATEST_TEST_KEY = "testflow.latest.v1";
// 限制最多保留的测试数量，避免超出 localStorage 配额（通常 5-10MB）
const MAX_CACHED_TESTS = 5;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readMap(): Record<string, GeneratedTest> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(TEST_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, GeneratedTest>;
    }
  } catch {
    return {};
  }

  return {};
}

function writeMap(value: Record<string, GeneratedTest>): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(TEST_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    // localStorage 配额超限或其他错误
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.warn("localStorage 配额已满，尝试清理旧数据后重试");
      // 尝试清理最旧的数据后重试
      const entries = Object.entries(value);
      if (entries.length > 1) {
        // 按创建时间排序，保留最新的
        entries.sort((a, b) => {
          const timeA = new Date(a[1].createdAt).getTime();
          const timeB = new Date(b[1].createdAt).getTime();
          return timeB - timeA; // 降序，最新的在前
        });
        // 只保留最新的 MAX_CACHED_TESTS 个
        const limited = Object.fromEntries(entries.slice(0, MAX_CACHED_TESTS));
        try {
          window.localStorage.setItem(TEST_CACHE_KEY, JSON.stringify(limited));
        } catch {
          // 如果还是失败，清空所有缓存
          console.error("清理后仍无法保存，清空缓存");
          window.localStorage.removeItem(TEST_CACHE_KEY);
        }
      }
    } else {
      console.error("保存测试数据失败：", error);
    }
  }
}

function limitCacheSize(map: Record<string, GeneratedTest>): Record<string, GeneratedTest> {
  const entries = Object.entries(map);
  if (entries.length <= MAX_CACHED_TESTS) {
    return map;
  }

  // 按创建时间排序，保留最新的 MAX_CACHED_TESTS 个
  entries.sort((a, b) => {
    const timeA = new Date(a[1].createdAt).getTime();
    const timeB = new Date(b[1].createdAt).getTime();
    return timeB - timeA; // 降序，最新的在前
  });

  return Object.fromEntries(entries.slice(0, MAX_CACHED_TESTS));
}

export function saveGeneratedTest(test: GeneratedTest): void {
  const map = readMap();
  map[test.id] = test;
  // 限制缓存大小，避免超出配额
  const limitedMap = limitCacheSize(map);
  writeMap(limitedMap);
}

export function loadGeneratedTest(testId: string): GeneratedTest | null {
  const map = readMap();
  return map[testId] ?? null;
}

export function saveLatestTestId(testId: string): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(LATEST_TEST_KEY, testId);
}

export function loadLatestTestId(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(LATEST_TEST_KEY);
}
