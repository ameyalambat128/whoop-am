import { createServer } from "node:http";
import { saveTokens } from "./whoop-auth.ts";
import type { WhoopTokens } from "./types.ts";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const OAUTH_SCOPES = "read:recovery read:sleep read:workout read:cycles read:profile offline";

const clientId = process.env.WHOOP_CLIENT_ID;
const clientSecret = process.env.WHOOP_CLIENT_SECRET;
const redirectUri = process.env.WHOOP_REDIRECT_URI || "http://localhost:3000/callback";

if (!clientId || !clientSecret) {
  console.error("Missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET in .env");
  process.exit(1);
}

const stateParameter = crypto.randomUUID();

const authorizationUrl = new URL(WHOOP_AUTH_URL);
authorizationUrl.searchParams.set("client_id", clientId);
authorizationUrl.searchParams.set("redirect_uri", redirectUri);
authorizationUrl.searchParams.set("response_type", "code");
authorizationUrl.searchParams.set("scope", OAUTH_SCOPES);
authorizationUrl.searchParams.set("state", stateParameter);

console.log("\nOpen this URL in your browser to authorize:\n");
console.log(authorizationUrl.toString());
console.log("\nWaiting for callback...\n");

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url!, `http://${request.headers.host}`);

  if (requestUrl.pathname !== "/callback") {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const authorizationCode = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");

  if (returnedState !== stateParameter) {
    response.writeHead(400);
    response.end("State mismatch — possible CSRF attack");
    return;
  }

  if (!authorizationCode) {
    response.writeHead(400);
    response.end("No authorization code received");
    return;
  }

  const tokenRequestBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: authorizationCode,
  });

  const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    response.writeHead(500);
    response.end(`Token exchange failed: ${errorText}`);
    console.error("Token exchange failed:", errorText);
    return;
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const tokens: WhoopTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  await saveTokens(tokens);

  response.writeHead(200, { "Content-Type": "text/html" });
  response.end("<h1>Authorized! You can close this tab.</h1>");

  console.log("Tokens saved to data/whoop-tokens.json");

  server.close();
  process.exit(0);
});

server.listen(3000, () => {
  console.log("Listening on:");
  console.log("  http://localhost:3000");
  console.log("  http://127.0.0.1:3000");
});
