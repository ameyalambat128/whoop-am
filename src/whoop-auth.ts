import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { WhoopTokens } from "./types.ts";

const DATA_DIRECTORY = join(import.meta.dir, "..", "data");
const TOKENS_FILE_PATH = join(DATA_DIRECTORY, "whoop-tokens.json");
const TOKEN_REFRESH_BUFFER_MILLISECONDS = 5 * 60 * 1000;

const WHOOP_TOKEN_ENDPOINT = "https://api.prod.whoop.com/oauth/oauth2/token";

export async function loadTokens(): Promise<WhoopTokens> {
  const rawTokenData = await readFile(TOKENS_FILE_PATH, "utf-8");
  return JSON.parse(rawTokenData) as WhoopTokens;
}

export async function saveTokens(tokens: WhoopTokens): Promise<void> {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await writeFile(TOKENS_FILE_PATH, JSON.stringify(tokens, null, 2));
}

async function refreshAccessToken(tokens: WhoopTokens): Promise<WhoopTokens> {
  const requestBody = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    refresh_token: tokens.refreshToken,
    scope: "offline",
  });

  const response = await fetch(WHOOP_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const refreshedTokens: WhoopTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  await saveTokens(refreshedTokens);
  return refreshedTokens;
}

export async function getValidAccessToken(): Promise<string> {
  let tokens = await loadTokens();

  const tokenIsExpiringSoon =
    tokens.expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MILLISECONDS;

  if (tokenIsExpiringSoon) {
    tokens = await refreshAccessToken(tokens);
  }

  return tokens.accessToken;
}
