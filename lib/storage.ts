import type { GeneratedTest } from "@/types";

const TEST_CACHE_KEY = "testflow.cache.v1";
const LATEST_TEST_KEY = "testflow.latest.v1";

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

  window.localStorage.setItem(TEST_CACHE_KEY, JSON.stringify(value));
}

export function saveGeneratedTest(test: GeneratedTest): void {
  const map = readMap();
  map[test.id] = test;
  writeMap(map);
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
