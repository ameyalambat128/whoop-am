import Anthropic from "@anthropic-ai/sdk";
import type { DailySummary, ConversationMessage } from "./types.ts";

const anthropicClient = new Anthropic();
const CONFIGURED_MODEL = process.env.AI_MODEL || "claude-haiku-4-5-20251001";
const MAX_RESPONSE_TOKENS = 300;

const PERSONALITY_CORE = `You are texting a friend about their health data via iMessage. You are warm and subtly witty — never forced, never sycophantic.

Tone rules:
- Sound like a friend, not a chatbot or health app. No corporate jargon.
- Be concise. No preamble, no postamble. Never say "Let me know if you need anything else" or "Anything specific you want to know?"
- Match the user's texting style. If they text lowercase, you text lowercase. If they're brief, be brief.
- Never repeat what the user said back to them when acknowledging something. Just respond naturally.
- Humor should be organic and original. Never force jokes. If a normal response works better, use that.
- Don't overuse "lol" or "lmao" just to seem casual. Only when genuinely fitting.
- Only use emojis if the user has used them first. When you do, use common ones sparingly.
- Never offer unsolicited help or ask if they want more detail. Use your judgment.
- At the end of a conversation, it's fine to say nothing rather than force a closing line.
- NEVER use markdown formatting (no **bold**, no *italics*, no headers, no bullet points). This is iMessage — plain text only.`;

export function formatDailySummaryForContext(summary: DailySummary): string {
  const parts: string[] = [`Date: ${summary.date}`];

  if (summary.recovery) {
    parts.push(
      `Recovery: ${summary.recovery.recoveryScore}%`,
      `HRV: ${summary.recovery.hrvRmssdMilliseconds}ms`,
      `Resting HR: ${summary.recovery.restingHeartRate}bpm`
    );
    if (summary.recovery.spo2Percentage) {
      parts.push(`SpO2: ${summary.recovery.spo2Percentage}%`);
    }
    if (summary.recovery.skinTemperatureCelsius) {
      parts.push(`Skin temp: ${summary.recovery.skinTemperatureCelsius}°C`);
    }
  }

  if (summary.sleep) {
    parts.push(
      `Sleep: ${summary.sleep.totalSleepTimeHours}h (${summary.sleep.sleepPerformancePercentage}% performance)`,
      `Deep: ${summary.sleep.deepSleepHours}h, REM: ${summary.sleep.remSleepHours}h, Light: ${summary.sleep.lightSleepHours}h`
    );
    if (summary.sleep.sleepEfficiency) {
      parts.push(`Efficiency: ${summary.sleep.sleepEfficiency}%`);
    }
    if (summary.sleep.disturbanceCount !== null) {
      parts.push(`Disturbances: ${summary.sleep.disturbanceCount}`);
    }
  }

  if (summary.cycle) {
    parts.push(
      `Strain: ${summary.cycle.strain}`,
      `Calories: ${summary.cycle.kilojoules}kJ`
    );
  }

  if (summary.workouts.length > 0) {
    const workoutDescriptions = summary.workouts
      .map(
        (workout) =>
          `${workout.sportName} (${workout.durationMinutes}min, strain ${workout.strain})`
      )
      .join(", ");
    parts.push(`Workouts: ${workoutDescriptions}`);
  }

  return parts.join("\n");
}

export function formatTrendDataForContext(recentDays: DailySummary[]): string {
  if (recentDays.length === 0) return "No trend data available.";

  const trendLines = recentDays.map((day) => {
    const recoveryText = day.recovery
      ? `Recovery ${day.recovery.recoveryScore}%, HRV ${day.recovery.hrvRmssdMilliseconds}ms`
      : "No recovery data";
    const sleepText = day.sleep
      ? `Sleep ${day.sleep.totalSleepTimeHours}h`
      : "No sleep data";
    return `${day.date}: ${recoveryText}, ${sleepText}`;
  });

  return `7-day trend:\n${trendLines.join("\n")}`;
}

export async function generateMorningSummaryMessage(
  todaySummary: DailySummary,
  recentTrends: DailySummary[]
): Promise<string> {
  const todayContext = formatDailySummaryForContext(todaySummary);
  const trendContext = formatTrendDataForContext(recentTrends);

  const morningSystemPrompt = `${PERSONALITY_CORE}

You're texting your friend their morning Whoop stats. Keep it to 2-4 sentences. Include the key numbers (recovery %, HRV, sleep hours). If the 7-day trend data shows something notable (HRV trending up, sleep getting worse), mention it naturally. No bullet points — this is a text message, not a report.`;

  const response = await anthropicClient.messages.create({
    model: CONFIGURED_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    system: morningSystemPrompt,
    messages: [
      {
        role: "user",
        content: `Here's today's Whoop data:\n\n${todayContext}\n\n${trendContext}\n\nGenerate the morning text message.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "Couldn't generate your morning summary.";
}

export async function generateConversationalResponse(
  userMessage: string,
  todaySummary: DailySummary,
  recentTrends: DailySummary[],
  conversationHistory: ConversationMessage[]
): Promise<string> {
  const todayContext = formatDailySummaryForContext(todaySummary);
  const trendContext = formatTrendDataForContext(recentTrends);

  const conversationalSystemPrompt = `${PERSONALITY_CORE}

You have the user's Whoop data for today and the past week. Answer health questions using the data. You can chat about other topics too — your expertise is health data but you're not limited to it. Match your response length to the user's message length.

Today's data:
${todayContext}

${trendContext}`;

  const messages: Anthropic.MessageParam[] = conversationHistory.map(
    (message) => ({
      role: message.role,
      content: message.content,
    })
  );
  messages.push({ role: "user", content: userMessage });

  const response = await anthropicClient.messages.create({
    model: CONFIGURED_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    system: conversationalSystemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "Hmm, couldn't think of a response.";
}
