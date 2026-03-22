import { IMessageSDK } from "@photon-ai/imessage-kit";
import { fetchTodaysSummary } from "./whoop-client.ts";
import { saveDailySummary, getLastSevenDays } from "./daily-cache.ts";
import { generateConversationalResponse } from "./ai-conversation.ts";
import type { ConversationMessage } from "./types.ts";

const MAX_CONVERSATION_HISTORY_LENGTH = 10;
const conversationHistory: ConversationMessage[] = [];
const processedMessageIds = new Set<string>();
const recentlySentMessageTexts = new Set<string>();

function trimProcessedMessageIds(): void {
  if (processedMessageIds.size > 500) {
    const idsArray = Array.from(processedMessageIds);
    const idsToRemove = idsArray.slice(0, idsArray.length - 200);
    for (const id of idsToRemove) {
      processedMessageIds.delete(id);
    }
  }
}

function trackSentMessage(text: string): void {
  recentlySentMessageTexts.add(text);
  setTimeout(() => recentlySentMessageTexts.delete(text), 30_000);
}

export async function startMessageWatcher(
  imessageSdk: IMessageSDK
): Promise<void> {
  const recipientPhoneNumber = process.env.IMESSAGE_RECIPIENT;
  if (!recipientPhoneNumber) {
    console.error("IMESSAGE_RECIPIENT not set, skipping message watcher");
    return;
  }

  const watcherStartedAt = new Date();
  let currentlyProcessing = false;

  await imessageSdk.startWatching({
    onDirectMessage: async (message) => {
      if (processedMessageIds.has(message.id)) return;
      processedMessageIds.add(message.id);
      trimProcessedMessageIds();

      if (message.date < watcherStartedAt) return;

      if (!message.text) return;

      if (recentlySentMessageTexts.has(message.text)) return;

      const senderMatchesRecipient =
        message.sender === recipientPhoneNumber ||
        message.sender.replace(/[\s\-\(\)]/g, "") ===
          recipientPhoneNumber.replace(/[\s\-\(\)]/g, "");

      if (!senderMatchesRecipient && !message.isFromMe) return;

      if (currentlyProcessing) return;
      currentlyProcessing = true;

      console.log(`Received: "${message.text}"`);

      try {
        const todaySummary = await fetchTodaysSummary();
        await saveDailySummary(todaySummary.date, todaySummary);
        const recentTrends = await getLastSevenDays();

        const responseText = await generateConversationalResponse(
          message.text,
          todaySummary,
          recentTrends,
          conversationHistory
        );

        conversationHistory.push(
          { role: "user", content: message.text },
          { role: "assistant", content: responseText }
        );

        while (conversationHistory.length > MAX_CONVERSATION_HISTORY_LENGTH * 2) {
          conversationHistory.shift();
        }

        trackSentMessage(responseText);
        await imessageSdk.send(recipientPhoneNumber, responseText);
        console.log(`Replied: "${responseText}"`);
      } catch (error) {
        console.error("Failed to handle message:", error);
      } finally {
        currentlyProcessing = false;
      }
    },
    onError: (error) => {
      console.error("Watcher error:", error);
    },
  });

  console.log("Message watcher started");
}
