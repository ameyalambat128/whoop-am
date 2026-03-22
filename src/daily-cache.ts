import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { DailySummary, DailyCache } from "./types.ts";

const DATA_DIRECTORY = join(import.meta.dir, "..", "data");
const CACHE_FILE_PATH = join(DATA_DIRECTORY, "daily-cache.json");

async function loadCache(): Promise<DailyCache> {
  try {
    const rawCacheData = await readFile(CACHE_FILE_PATH, "utf-8");
    return JSON.parse(rawCacheData) as DailyCache;
  } catch {
    return {};
  }
}

async function persistCache(cache: DailyCache): Promise<void> {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2));
}

export async function saveDailySummary(
  date: string,
  summary: DailySummary
): Promise<void> {
  const cache = await loadCache();
  cache[date] = summary;
  await persistCache(cache);
}

export async function getRecentDays(count: number): Promise<DailySummary[]> {
  const cache = await loadCache();
  const sortedDates = Object.keys(cache).sort().reverse().slice(0, count);
  return sortedDates.map((date) => cache[date]!);
}

export async function getLastSevenDays(): Promise<DailySummary[]> {
  return getRecentDays(7);
}

export async function getCachedSummaryForDate(
  date: string
): Promise<DailySummary | null> {
  const cache = await loadCache();
  return cache[date] ?? null;
}
