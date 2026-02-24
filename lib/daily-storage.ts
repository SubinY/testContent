import { promises as fs } from "fs";
import path from "path";

import { list, put } from "@vercel/blob";

import type { DailyContent } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "daily-content.json");
const BLOB_PATH = "data/daily-content.json";

const isVercel = process.env.VERCEL === "1";
const useBlob = isVercel && !!process.env.BLOB_READ_WRITE_TOKEN;

async function ensureStoreFs(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, "{}", "utf8");
  }
}

async function readStoreFs(): Promise<Record<string, DailyContent>> {
  await ensureStoreFs();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Record<string, DailyContent>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function readStoreBlob(): Promise<Record<string, DailyContent>> {
  try {
    const { blobs } = await list({ prefix: "data/" });
    const blob = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!blob?.url) return {};
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return {};
    const res = await fetch(blob.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const raw = await res.text();
    const parsed = JSON.parse(raw) as Record<string, DailyContent>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function readStore(): Promise<Record<string, DailyContent>> {
  if (useBlob) {
    return readStoreBlob();
  }
  return readStoreFs();
}

async function writeStoreFs(store: Record<string, DailyContent>): Promise<void> {
  await ensureStoreFs();
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function writeStoreBlob(store: Record<string, DailyContent>): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(store, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  } as unknown as Parameters<typeof put>[2]);
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
  if (useBlob) {
    await writeStoreBlob(store);
  } else {
    await writeStoreFs(store);
  }
}

export async function checkContentExists(date: string): Promise<boolean> {
  const store = await readStore();
  return Boolean(store[date]);
}
