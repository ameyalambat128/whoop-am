export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SleepSummary {
  sleepPerformancePercentage: number | null;
  totalSleepTimeHours: number | null;
  remSleepHours: number | null;
  deepSleepHours: number | null;
  lightSleepHours: number | null;
  sleepEfficiency: number | null;
  disturbanceCount: number | null;
  respiratoryRate: number | null;
}

export interface RecoverySummary {
  recoveryScore: number | null;
  restingHeartRate: number | null;
  hrvRmssdMilliseconds: number | null;
  spo2Percentage: number | null;
  skinTemperatureCelsius: number | null;
}

export interface CycleSummary {
  strain: number | null;
  kilojoules: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
}

export interface WorkoutSummary {
  sportName: string;
  strain: number | null;
  durationMinutes: number;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
}

export interface DailySummary {
  date: string;
  sleep: SleepSummary | null;
  recovery: RecoverySummary | null;
  cycle: CycleSummary | null;
  workouts: WorkoutSummary[];
  fetchedAt: string;
  scoringComplete: boolean;
}

export interface DailyCache {
  [isoDate: string]: DailySummary;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
