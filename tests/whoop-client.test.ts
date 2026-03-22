import { describe, test, expect } from "bun:test";
import {
  millisecondsToHours,
  millisecondsToMinutes,
  SPORT_ID_TO_NAME,
} from "../src/whoop-client.ts";

describe("millisecondsToHours", () => {
  test("converts exact hours", () => {
    expect(millisecondsToHours(3_600_000)).toBe(1);
    expect(millisecondsToHours(7_200_000)).toBe(2);
  });

  test("rounds to one decimal place", () => {
    expect(millisecondsToHours(5_400_000)).toBe(1.5);
    expect(millisecondsToHours(27_000_000)).toBe(7.5);
  });

  test("handles zero", () => {
    expect(millisecondsToHours(0)).toBe(0);
  });

  test("handles typical sleep duration (~7.3 hours)", () => {
    const sevenPointThreeHoursInMs = 7.3 * 60 * 60 * 1000;
    expect(millisecondsToHours(sevenPointThreeHoursInMs)).toBe(7.3);
  });
});

describe("millisecondsToMinutes", () => {
  test("converts exact minutes", () => {
    expect(millisecondsToMinutes(60_000)).toBe(1);
    expect(millisecondsToMinutes(3_600_000)).toBe(60);
  });

  test("rounds to nearest minute", () => {
    expect(millisecondsToMinutes(90_000)).toBe(2);
    expect(millisecondsToMinutes(45_000)).toBe(1);
  });

  test("handles zero", () => {
    expect(millisecondsToMinutes(0)).toBe(0);
  });
});

describe("SPORT_ID_TO_NAME", () => {
  test("maps common sport IDs", () => {
    expect(SPORT_ID_TO_NAME.get(0)).toBe("Running");
    expect(SPORT_ID_TO_NAME.get(1)).toBe("Cycling");
    expect(SPORT_ID_TO_NAME.get(45)).toBe("Weightlifting");
    expect(SPORT_ID_TO_NAME.get(52)).toBe("HIIT");
  });

  test("maps negative ID for generic activity", () => {
    expect(SPORT_ID_TO_NAME.get(-1)).toBe("Activity");
  });

  test("returns undefined for unknown IDs", () => {
    expect(SPORT_ID_TO_NAME.get(999)).toBeUndefined();
  });
});
