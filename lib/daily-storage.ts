import path from "path";

import { readJSON, writeJSON } from "@/lib/storage";
import type { DailyContent } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "daily-content.json");

async function readStore(): Promise<Record<string, DailyContent>> {
  const store = await readJSON<Record<string, DailyContent>>(DATA_PATH, {});
  return store && typeof store === "object" ? store : {};
}

export async function readDailyContent(
  date?: string
): Promise<DailyContent | Record<string, DailyContent> | null> {
  const store = await readStore();
  if (!date) {
    return store;
  }
  return store[date] ?? null;
}

export async function writeDailyContent(date: string, content: DailyContent): Promise<void> {
  const store = await readStore();
  store[date] = content;
  await writeJSON(DATA_PATH, store);
}

export async function checkContentExists(date: string): Promise<boolean> {
  const store = await readStore();
  return Boolean(store[date]);
}
