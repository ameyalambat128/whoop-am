import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  saveDailySummary,
  getRecentDays,
  getLastSevenDays,
  getCachedSummaryForDate,
} from "../src/daily-cache.ts";
import type { DailySummary } from "../src/types.ts";

const CACHE_FILE_PATH = join(import.meta.dir, "..", "data", "daily-cache.json");

function createTestSummary(date: string): DailySummary {
  return {
    date,
    sleep: null,
    recovery: {
      recoveryScore: 75,
      restingHeartRate: 55,
      hrvRmssdMilliseconds: 80,
      spo2Percentage: null,
      skinTemperatureCelsius: null,
    },
    cycle: null,
    workouts: [],
    fetchedAt: new Date().toISOString(),
    scoringComplete: false,
  };
}

beforeEach(async () => {
  try {
    await unlink(CACHE_FILE_PATH);
  } catch {}
});

afterAll(async () => {
  try {
    await unlink(CACHE_FILE_PATH);
  } catch {}
});

describe("daily cache", () => {
  test("saves and retrieves a summary by date", async () => {
    const summary = createTestSummary("2026-03-22");
    await saveDailySummary("2026-03-22", summary);

    const retrieved = await getCachedSummaryForDate("2026-03-22");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.date).toBe("2026-03-22");
    expect(retrieved!.recovery!.recoveryScore).toBe(75);
  });

  test("returns null for uncached date", async () => {
    const retrieved = await getCachedSummaryForDate("2099-01-01");
    expect(retrieved).toBeNull();
  });

  test("upserts existing date", async () => {
    await saveDailySummary("2026-03-22", createTestSummary("2026-03-22"));

    const updatedSummary = createTestSummary("2026-03-22");
    updatedSummary.recovery!.recoveryScore = 90;
    await saveDailySummary("2026-03-22", updatedSummary);

    const retrieved = await getCachedSummaryForDate("2026-03-22");
    expect(retrieved!.recovery!.recoveryScore).toBe(90);
  });

  test("getRecentDays returns days in reverse chronological order", async () => {
    await saveDailySummary("2026-03-20", createTestSummary("2026-03-20"));
    await saveDailySummary("2026-03-22", createTestSummary("2026-03-22"));
    await saveDailySummary("2026-03-21", createTestSummary("2026-03-21"));

    const recent = await getRecentDays(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]!.date).toBe("2026-03-22");
    expect(recent[1]!.date).toBe("2026-03-21");
    expect(recent[2]!.date).toBe("2026-03-20");
  });

  test("getRecentDays respects count limit", async () => {
    await saveDailySummary("2026-03-20", createTestSummary("2026-03-20"));
    await saveDailySummary("2026-03-21", createTestSummary("2026-03-21"));
    await saveDailySummary("2026-03-22", createTestSummary("2026-03-22"));

    const recent = await getRecentDays(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]!.date).toBe("2026-03-22");
    expect(recent[1]!.date).toBe("2026-03-21");
  });

  test("getLastSevenDays returns up to 7 days", async () => {
    for (let i = 1; i <= 10; i++) {
      const date = `2026-03-${String(i).padStart(2, "0")}`;
      await saveDailySummary(date, createTestSummary(date));
    }

    const sevenDays = await getLastSevenDays();
    expect(sevenDays).toHaveLength(7);
    expect(sevenDays[0]!.date).toBe("2026-03-10");
  });
});
