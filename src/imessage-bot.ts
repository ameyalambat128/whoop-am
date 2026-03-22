import { IMessageSDK } from "@photon-ai/imessage-kit";
import { fetchTodaysSummary } from "./whoop-client.ts";
import { saveDailySummary, getLastSevenDays } from "./daily-cache.ts";
import { generateConversationalResponse } from "./ai-conversation.ts";
import type { ConversationMessage } from "./types.ts";

const MAX_CONVERSATION_HISTORY_LENGTH = 10;
const conversationHistory: ConversationMessage[] = [];
const processedMessageIds = new Set<string>();

function trimProcessedMessageIds(): void {
  if (processedMessageIds.size > 500) {
    const idsArray = Array.from(processedMessageIds);
    const idsToRemove = idsArray.slice(0, idsArray.length - 200);
    for (const id of idsToRemove) {
      processedMessageIds.delete(id);
    }
  }
}

export async function startMessageWatcher(
  imessageSdk: IMessageSDK
): Promise<void> {
  const recipientPhoneNumber = process.env.IMESSAGE_RECIPIENT;
  if (!recipientPhoneNumber) {
    console.error("IMESSAGE_RECIPIENT not set, skipping message watcher");
    return;
  }

  await imessageSdk.startWatching({
    onDirectMessage: async (message) => {
      if (message.isFromMe) return;
      if (processedMessageIds.has(message.id)) return;
      processedMessageIds.add(message.id);
      trimProcessedMessageIds();

      const senderMatchesRecipient =
        message.sender === recipientPhoneNumber ||
        message.sender.replace(/[\s\-\(\)]/g, "") ===
          recipientPhoneNumber.replace(/[\s\-\(\)]/g, "");

      if (!senderMatchesRecipient) return;
      if (!message.text) return;

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

        await imessageSdk.send(recipientPhoneNumber, responseText);
        console.log(`Replied: "${responseText}"`);
      } catch (error) {
        console.error("Failed to handle message:", error);
      }
    },
    onError: (error) => {
      console.error("Watcher error:", error);
    },
  });

  console.log("Message watcher started");
}
