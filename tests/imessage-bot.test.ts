import { describe, test, expect } from "bun:test";

describe("message loop prevention", () => {
  test("recentlySentMessageTexts tracks and expires sent messages", async () => {
    const recentlySentMessageTexts = new Set<string>();

    const trackSentMessage = (text: string, ttlMs: number = 100) => {
      recentlySentMessageTexts.add(text);
      setTimeout(() => recentlySentMessageTexts.delete(text), ttlMs);
    };

    trackSentMessage("hello from bot", 100);

    expect(recentlySentMessageTexts.has("hello from bot")).toBe(true);
    expect(recentlySentMessageTexts.has("different message")).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(recentlySentMessageTexts.has("hello from bot")).toBe(false);
  });

  test("processedMessageIds deduplicates messages", () => {
    const processedMessageIds = new Set<string>();

    const isNewMessage = (id: string): boolean => {
      if (processedMessageIds.has(id)) return false;
      processedMessageIds.add(id);
      return true;
    };

    expect(isNewMessage("msg-001")).toBe(true);
    expect(isNewMessage("msg-001")).toBe(false);
    expect(isNewMessage("msg-002")).toBe(true);
  });

  test("processedMessageIds trimming keeps recent entries", () => {
    const processedMessageIds = new Set<string>();
    const maxSize = 10;
    const keepSize = 5;

    for (let i = 0; i < 15; i++) {
      processedMessageIds.add(`msg-${i}`);
    }

    if (processedMessageIds.size > maxSize) {
      const idsArray = Array.from(processedMessageIds);
      const idsToRemove = idsArray.slice(0, idsArray.length - keepSize);
      for (const id of idsToRemove) {
        processedMessageIds.delete(id);
      }
    }

    expect(processedMessageIds.size).toBe(keepSize);
    expect(processedMessageIds.has("msg-10")).toBe(true);
    expect(processedMessageIds.has("msg-14")).toBe(true);
    expect(processedMessageIds.has("msg-0")).toBe(false);
  });

  test("watcherStartedAt filters old messages", () => {
    const watcherStartedAt = new Date();

    const oldMessageDate = new Date(watcherStartedAt.getTime() - 60_000);
    const newMessageDate = new Date(watcherStartedAt.getTime() + 1_000);

    expect(oldMessageDate < watcherStartedAt).toBe(true);
    expect(newMessageDate < watcherStartedAt).toBe(false);
  });

  test("phone number normalization matches different formats", () => {
    const recipientPhoneNumber = "+16024190407";

    const normalize = (phone: string) => phone.replace(/[\s\-\(\)]/g, "");

    expect(normalize("+1 (602) 419-0407")).toBe(normalize(recipientPhoneNumber));
    expect(normalize("+16024190407")).toBe(normalize(recipientPhoneNumber));
    expect(normalize("+1 602-419-0407")).toBe(normalize(recipientPhoneNumber));
  });
});
