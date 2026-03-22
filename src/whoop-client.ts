import { getValidAccessToken } from "./whoop-auth.ts";
import type {
  SleepSummary,
  RecoverySummary,
  CycleSummary,
  WorkoutSummary,
  DailySummary,
} from "./types.ts";

const WHOOP_API_BASE_URL = "https://api.prod.whoop.com/developer";

interface WhoopApiResponse<T> {
  records: T[];
  next_token: string | null;
}

interface WhoopSleepRecord {
  id: number;
  score_state: string;
  score?: {
    stage_summary?: {
      total_in_bed_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      total_awake_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_performance_percentage?: number;
    sleep_efficiency_percentage?: number;
    respiratory_rate?: number;
  };
}

interface WhoopRecoveryRecord {
  id: number;
  cycle_id: number;
  score_state: string;
  score?: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

interface WhoopCycleRecord {
  id: number;
  score_state: string;
  start: string;
  end: string;
  score?: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

interface WhoopWorkoutRecord {
  id: number;
  sport_id: number;
  score_state: string;
  start: string;
  end: string;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    distance_meter?: number;
  };
}

export const SPORT_ID_TO_NAME = new Map<number, string>([
  [-1, "Activity"],
  [0, "Running"],
  [1, "Cycling"],
  [16, "Baseball"],
  [17, "Basketball"],
  [18, "Rowing"],
  [19, "Fencing"],
  [20, "Field Hockey"],
  [21, "Football"],
  [22, "Golf"],
  [24, "Ice Hockey"],
  [25, "Lacrosse"],
  [27, "Rugby"],
  [28, "Sailing"],
  [29, "Skiing"],
  [30, "Soccer"],
  [31, "Softball"],
  [32, "Squash"],
  [33, "Swimming"],
  [34, "Tennis"],
  [35, "Track & Field"],
  [36, "Volleyball"],
  [37, "Water Polo"],
  [38, "Wrestling"],
  [39, "Boxing"],
  [42, "Dance"],
  [43, "Pilates"],
  [44, "Yoga"],
  [45, "Weightlifting"],
  [47, "Cross Country Skiing"],
  [48, "Functional Fitness"],
  [49, "Duathlon"],
  [51, "Gymnastics"],
  [52, "HIIT"],
  [53, "Martial Arts"],
  [55, "Meditation"],
  [56, "Other"],
  [57, "Paddle Tennis"],
  [59, "Snowboarding"],
  [60, "Surfing"],
  [61, "Triathlon"],
  [62, "Walking"],
  [63, "Wheelchair Pushing"],
  [64, "Assault Bike"],
  [65, "Kayaking"],
  [66, "Spin"],
  [70, "Hiking"],
  [71, "Obstacle Course Racing"],
  [73, "Motor Sport"],
  [74, "Elliptical"],
  [75, "Stairmaster"],
  [76, "Pickleball"],
  [82, "Jumprope"],
  [84, "Barre"],
  [85, "Climber"],
  [86, "Rucking"],
  [87, "Paddleboarding"],
]);

async function whoopApiRequest<T>(
  endpointPath: string,
  queryParameters?: Record<string, string>
): Promise<T> {
  const accessToken = await getValidAccessToken();

  const requestUrl = new URL(`${WHOOP_API_BASE_URL}${endpointPath}`);
  if (queryParameters) {
    for (const [key, value] of Object.entries(queryParameters)) {
      requestUrl.searchParams.set(key, value);
    }
  }

  const response = await fetch(requestUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Whoop API error ${response.status} at ${endpointPath}: ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

export function millisecondsToHours(milliseconds: number): number {
  return Math.round((milliseconds / (1000 * 60 * 60)) * 10) / 10;
}

export function millisecondsToMinutes(milliseconds: number): number {
  return Math.round(milliseconds / (1000 * 60));
}

export async function fetchLatestSleep(): Promise<SleepSummary | null> {
  const response = await whoopApiRequest<WhoopApiResponse<WhoopSleepRecord>>(
    "/v1/activity/sleep",
    { limit: "1" }
  );

  const sleepRecord = response.records[0];
  if (!sleepRecord || sleepRecord.score_state !== "SCORED" || !sleepRecord.score) {
    return null;
  }

  const stages = sleepRecord.score.stage_summary;
  return {
    sleepPerformancePercentage: sleepRecord.score.sleep_performance_percentage ?? null,
    totalSleepTimeHours: stages ? millisecondsToHours(stages.total_in_bed_time_milli - stages.total_awake_time_milli) : null,
    remSleepHours: stages ? millisecondsToHours(stages.total_rem_sleep_time_milli) : null,
    deepSleepHours: stages ? millisecondsToHours(stages.total_slow_wave_sleep_time_milli) : null,
    lightSleepHours: stages ? millisecondsToHours(stages.total_light_sleep_time_milli) : null,
    sleepEfficiency: sleepRecord.score.sleep_efficiency_percentage ?? null,
    disturbanceCount: stages?.disturbance_count ?? null,
    respiratoryRate: sleepRecord.score.respiratory_rate ?? null,
  };
}

export async function fetchLatestRecovery(): Promise<RecoverySummary | null> {
  const response = await whoopApiRequest<WhoopApiResponse<WhoopRecoveryRecord>>(
    "/v1/recovery",
    { limit: "1" }
  );

  const recoveryRecord = response.records[0];
  if (!recoveryRecord || recoveryRecord.score_state !== "SCORED" || !recoveryRecord.score) {
    return null;
  }

  return {
    recoveryScore: recoveryRecord.score.recovery_score,
    restingHeartRate: recoveryRecord.score.resting_heart_rate,
    hrvRmssdMilliseconds: Math.round(recoveryRecord.score.hrv_rmssd_milli * 10) / 10,
    spo2Percentage: recoveryRecord.score.spo2_percentage ?? null,
    skinTemperatureCelsius: recoveryRecord.score.skin_temp_celsius ?? null,
  };
}

export async function fetchLatestCycle(): Promise<CycleSummary | null> {
  const response = await whoopApiRequest<WhoopApiResponse<WhoopCycleRecord>>(
    "/v1/cycle",
    { limit: "1" }
  );

  const cycleRecord = response.records[0];
  if (!cycleRecord || cycleRecord.score_state !== "SCORED" || !cycleRecord.score) {
    return null;
  }

  return {
    strain: Math.round(cycleRecord.score.strain * 10) / 10,
    kilojoules: Math.round(cycleRecord.score.kilojoule),
    averageHeartRate: cycleRecord.score.average_heart_rate,
    maxHeartRate: cycleRecord.score.max_heart_rate,
  };
}

export async function fetchLatestWorkouts(
  count: number = 3
): Promise<WorkoutSummary[]> {
  const response = await whoopApiRequest<WhoopApiResponse<WhoopWorkoutRecord>>(
    "/v1/activity/workout",
    { limit: String(count) }
  );

  return response.records
    .filter((workout) => workout.score_state === "SCORED" && workout.score)
    .map((workout) => {
      const startTime = new Date(workout.start).getTime();
      const endTime = new Date(workout.end).getTime();

      return {
        sportName: SPORT_ID_TO_NAME.get(workout.sport_id) ?? `Sport ${workout.sport_id}`,
        strain: workout.score ? Math.round(workout.score.strain * 10) / 10 : null,
        durationMinutes: millisecondsToMinutes(endTime - startTime),
        averageHeartRate: workout.score?.average_heart_rate ?? null,
        maxHeartRate: workout.score?.max_heart_rate ?? null,
      };
    });
}

export async function fetchTodaysSummary(): Promise<DailySummary> {
  const todayIsoDate = new Date().toISOString().split("T")[0]!;

  const [sleep, recovery, cycle, workouts] = await Promise.all([
    fetchLatestSleep().catch(() => null),
    fetchLatestRecovery().catch(() => null),
    fetchLatestCycle().catch(() => null),
    fetchLatestWorkouts().catch(() => []),
  ]);

  const scoringComplete = sleep !== null && recovery !== null;

  return {
    date: todayIsoDate,
    sleep,
    recovery,
    cycle,
    workouts,
    fetchedAt: new Date().toISOString(),
    scoringComplete,
  };
}

export async function fetchSummariesForDateRange(
  startDate: string,
  endDate: string
): Promise<DailySummary[]> {
  const startIso = `${startDate}T00:00:00.000Z`;
  const endIso = `${endDate}T23:59:59.999Z`;
  const queryParams = { start: startIso, end: endIso, limit: "25" };

  const [sleepResponse, recoveryResponse, cycleResponse, workoutResponse] =
    await Promise.all([
      whoopApiRequest<WhoopApiResponse<WhoopSleepRecord>>(
        "/v1/activity/sleep",
        queryParams
      ).catch(() => ({ records: [] as WhoopSleepRecord[], next_token: null })),
      whoopApiRequest<WhoopApiResponse<WhoopRecoveryRecord>>(
        "/v1/recovery",
        queryParams
      ).catch(() => ({ records: [] as WhoopRecoveryRecord[], next_token: null })),
      whoopApiRequest<WhoopApiResponse<WhoopCycleRecord>>(
        "/v1/cycle",
        queryParams
      ).catch(() => ({ records: [] as WhoopCycleRecord[], next_token: null })),
      whoopApiRequest<WhoopApiResponse<WhoopWorkoutRecord>>(
        "/v1/activity/workout",
        queryParams
      ).catch(() => ({ records: [] as WhoopWorkoutRecord[], next_token: null })),
    ]);

  const dateSet = new Set<string>();
  const addDatesFromRecords = (records: Array<{ created_at?: string; start?: string }>) => {
    for (const record of records) {
      const timestamp = record.created_at || record.start;
      if (timestamp) {
        dateSet.add(timestamp.split("T")[0]!);
      }
    }
  };

  addDatesFromRecords(sleepResponse.records as Array<{ created_at?: string }>);
  addDatesFromRecords(recoveryResponse.records as Array<{ created_at?: string }>);
  addDatesFromRecords(cycleResponse.records as Array<{ created_at?: string; start?: string }>);

  const summaries: DailySummary[] = [];
  for (const date of dateSet) {
    summaries.push({
      date,
      sleep: null,
      recovery: null,
      cycle: null,
      workouts: [],
      fetchedAt: new Date().toISOString(),
      scoringComplete: false,
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}
