import { describe, test, expect } from "bun:test";
import {
  formatDailySummaryForContext,
  formatTrendDataForContext,
} from "../src/ai-conversation.ts";
import type { DailySummary } from "../src/types.ts";

function createFullDailySummary(overrides?: Partial<DailySummary>): DailySummary {
  return {
    date: "2026-03-22",
    sleep: {
      sleepPerformancePercentage: 92,
      totalSleepTimeHours: 7.5,
      remSleepHours: 1.8,
      deepSleepHours: 1.2,
      lightSleepHours: 4.5,
      sleepEfficiency: 95,
      disturbanceCount: 3,
      respiratoryRate: 15.2,
    },
    recovery: {
      recoveryScore: 85,
      restingHeartRate: 52,
      hrvRmssdMilliseconds: 98.3,
      spo2Percentage: 97,
      skinTemperatureCelsius: 33.5,
    },
    cycle: {
      strain: 12.4,
      kilojoules: 8500,
      averageHeartRate: 72,
      maxHeartRate: 165,
    },
    workouts: [
      {
        sportName: "Running",
        strain: 14.2,
        durationMinutes: 45,
        averageHeartRate: 155,
        maxHeartRate: 178,
      },
    ],
    fetchedAt: "2026-03-22T07:00:00.000Z",
    scoringComplete: true,
    ...overrides,
  };
}

function createMinimalDailySummary(overrides?: Partial<DailySummary>): DailySummary {
  return {
    date: "2026-03-22",
    sleep: null,
    recovery: null,
    cycle: null,
    workouts: [],
    fetchedAt: "2026-03-22T07:00:00.000Z",
    scoringComplete: false,
    ...overrides,
  };
}

describe("formatDailySummaryForContext", () => {
  test("includes all data sections when fully scored", () => {
    const summary = createFullDailySummary();
    const formatted = formatDailySummaryForContext(summary);

    expect(formatted).toContain("Date: 2026-03-22");
    expect(formatted).toContain("Recovery: 85%");
    expect(formatted).toContain("HRV: 98.3ms");
    expect(formatted).toContain("Resting HR: 52bpm");
    expect(formatted).toContain("SpO2: 97%");
    expect(formatted).toContain("Skin temp: 33.5");
    expect(formatted).toContain("Sleep: 7.5h (92% performance)");
    expect(formatted).toContain("Deep: 1.2h, REM: 1.8h, Light: 4.5h");
    expect(formatted).toContain("Efficiency: 95%");
    expect(formatted).toContain("Disturbances: 3");
    expect(formatted).toContain("Strain: 12.4");
    expect(formatted).toContain("Running (45min, strain 14.2)");
  });

  test("handles missing recovery data", () => {
    const summary = createMinimalDailySummary();
    const formatted = formatDailySummaryForContext(summary);

    expect(formatted).toContain("Date: 2026-03-22");
    expect(formatted).not.toContain("Recovery");
    expect(formatted).not.toContain("Sleep");
    expect(formatted).not.toContain("Strain");
    expect(formatted).not.toContain("Workouts");
  });

  test("omits optional fields when null", () => {
    const summary = createFullDailySummary({
      recovery: {
        recoveryScore: 70,
        restingHeartRate: 58,
        hrvRmssdMilliseconds: 45,
        spo2Percentage: null,
        skinTemperatureCelsius: null,
      },
    });
    const formatted = formatDailySummaryForContext(summary);

    expect(formatted).toContain("Recovery: 70%");
    expect(formatted).not.toContain("SpO2");
    expect(formatted).not.toContain("Skin temp");
  });

  test("handles multiple workouts", () => {
    const summary = createFullDailySummary({
      workouts: [
        { sportName: "Running", strain: 10, durationMinutes: 30, averageHeartRate: 150, maxHeartRate: 170 },
        { sportName: "Yoga", strain: 3.5, durationMinutes: 60, averageHeartRate: 90, maxHeartRate: 110 },
      ],
    });
    const formatted = formatDailySummaryForContext(summary);

    expect(formatted).toContain("Running (30min, strain 10)");
    expect(formatted).toContain("Yoga (60min, strain 3.5)");
  });
});

describe("formatTrendDataForContext", () => {
  test("returns empty message when no days", () => {
    expect(formatTrendDataForContext([])).toBe("No trend data available.");
  });

  test("formats multiple days with recovery and sleep", () => {
    const days: DailySummary[] = [
      createFullDailySummary({ date: "2026-03-20" }),
      createFullDailySummary({ date: "2026-03-21" }),
    ];
    const formatted = formatTrendDataForContext(days);

    expect(formatted).toContain("7-day trend:");
    expect(formatted).toContain("2026-03-20: Recovery 85%, HRV 98.3ms, Sleep 7.5h");
    expect(formatted).toContain("2026-03-21: Recovery 85%, HRV 98.3ms, Sleep 7.5h");
  });

  test("shows fallback text for days without data", () => {
    const days: DailySummary[] = [
      createMinimalDailySummary({ date: "2026-03-20" }),
    ];
    const formatted = formatTrendDataForContext(days);

    expect(formatted).toContain("No recovery data");
    expect(formatted).toContain("No sleep data");
  });
});
