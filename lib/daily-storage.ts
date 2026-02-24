import { promises as fs } from "fs";
import path from "path";

import type { DailyContent } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "daily-content.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, "{}", "utf8");
  }
}

async function readStore(): Promise<Record<string, DailyContent>> {
  await ensureStore();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Record<string, DailyContent>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function checkContentExists(date: string): Promise<boolean> {
  const store = await readStore();
  return Boolean(store[date]);
}
