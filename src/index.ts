import cron from "node-cron";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { sendMorningMessage, wasMorningMessageSentToday } from "./morning-message.ts";
import { startMessageWatcher } from "./imessage-bot.ts";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "WHOOP_CLIENT_ID",
  "WHOOP_CLIENT_SECRET",
  "ANTHROPIC_API_KEY",
  "IMESSAGE_RECIPIENT",
];

function validateEnvironmentVariables(): void {
  const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingVariables.length > 0) {
    console.error(`Missing required env vars: ${missingVariables.join(", ")}`);
    console.error("Copy .env.example to .env and fill in your values.");
    process.exit(1);
  }
}

async function checkForMissedMorningMessage(
  imessageSdk: IMessageSDK
): Promise<void> {
  const cronExpression = process.env.MORNING_MESSAGE_CRON || "0 7 * * *";
  const scheduledHour = parseInt(cronExpression.split(" ")[1] ?? "7", 10);
  const currentHour = new Date().getHours();

  if (currentHour >= scheduledHour) {
    const alreadySentToday = await wasMorningMessageSentToday();
    if (!alreadySentToday) {
      console.log("Missed morning message detected, sending now...");
      await sendMorningMessage(imessageSdk);
    }
  }
}

async function main(): Promise<void> {
  validateEnvironmentVariables();

  const imessageSdk = new IMessageSDK({
    debug: false,
    watcher: {
      pollInterval: 3000,
      excludeOwnMessages: true,
    },
  });

  const cronExpression = process.env.MORNING_MESSAGE_CRON || "0 7 * * *";
  cron.schedule(cronExpression, async () => {
    console.log("Cron triggered: sending morning message...");
    await sendMorningMessage(imessageSdk);
  });

  await checkForMissedMorningMessage(imessageSdk);
  await startMessageWatcher(imessageSdk);

  const recipientPhoneNumber = process.env.IMESSAGE_RECIPIENT;
  console.log(`whoop-am running`);
  console.log(`  Recipient: ${recipientPhoneNumber}`);
  console.log(`  Morning message: ${cronExpression}`);
  console.log(`  AI model: ${process.env.AI_MODEL || "claude-haiku-4-5-20251001"}`);

  const shutdownGracefully = () => {
    console.log("\nShutting down...");
    imessageSdk.stopWatching();
    process.exit(0);
  };

  process.on("SIGINT", shutdownGracefully);
  process.on("SIGTERM", shutdownGracefully);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
