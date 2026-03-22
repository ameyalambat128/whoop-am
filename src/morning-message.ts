import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { fetchTodaysSummary } from "./whoop-client.ts";
import { saveDailySummary, getLastSevenDays } from "./daily-cache.ts";
import { generateMorningSummaryMessage } from "./ai-conversation.ts";

const DATA_DIRECTORY = join(import.meta.dir, "..", "data");
const LAST_MORNING_MESSAGE_FILE = join(DATA_DIRECTORY, "last-morning-message.txt");

async function getLastMorningMessageDate(): Promise<string | null> {
  try {
    const dateString = await readFile(LAST_MORNING_MESSAGE_FILE, "utf-8");
    return dateString.trim();
  } catch {
    return null;
  }
}

async function recordMorningMessageSent(): Promise<void> {
  const todayIsoDate = new Date().toISOString().split("T")[0]!;
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await writeFile(LAST_MORNING_MESSAGE_FILE, todayIsoDate);
}

export async function wasMorningMessageSentToday(): Promise<boolean> {
  const lastSentDate = await getLastMorningMessageDate();
  const todayIsoDate = new Date().toISOString().split("T")[0]!;
  return lastSentDate === todayIsoDate;
}

export async function sendMorningMessage(
  imessageSdk: IMessageSDK
): Promise<void> {
  const recipientPhoneNumber = process.env.IMESSAGE_RECIPIENT;
  if (!recipientPhoneNumber) {
    console.error("IMESSAGE_RECIPIENT not set, skipping morning message");
    return;
  }

  try {
    const todaySummary = await fetchTodaysSummary();
    await saveDailySummary(todaySummary.date, todaySummary);

    const recentTrends = await getLastSevenDays();
    const messageText = await generateMorningSummaryMessage(
      todaySummary,
      recentTrends
    );

    await imessageSdk.send(recipientPhoneNumber, messageText);
    await recordMorningMessageSent();

    console.log(`Morning message sent at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error("Failed to send morning message:", error);

    try {
      await imessageSdk.send(
        recipientPhoneNumber,
        "Couldn't grab your Whoop data this morning — text me and I'll try again"
      );
    } catch (fallbackError) {
      console.error("Failed to send fallback message:", fallbackError);
    }
  }
}
