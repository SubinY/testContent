import { promises as fs } from "fs";
import path from "path";

export async function readJSON<T>(filePath: string, fallback: T): Promise<T> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(absolutePath);
  } catch {
    await fs.writeFile(absolutePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
  const raw = await fs.readFile(absolutePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, JSON.stringify(data, null, 2), "utf8");
}
