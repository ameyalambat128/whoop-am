# whoop-am

A personal iMessage bot that texts you your Whoop stats every morning and lets you chat about your health data.

Built with [imessage-kit](https://github.com/photon-hq/imessage-kit), the Whoop API, and Claude.

## How it works

- Sends you a morning text with your recovery score, HRV, sleep stats, and 7-day trends
- Watches for incoming iMessages and responds to questions about your Whoop data
- Uses Claude to generate natural, conversational responses (not robotic summaries)

## Setup

### Prerequisites

- macOS with iMessage signed in
- A [Whoop](https://www.whoop.com/) account and device
- [Bun](https://bun.sh/) runtime
- An [Anthropic API key](https://console.anthropic.com/)
- **Full Disk Access** enabled for your terminal app (System Settings → Privacy & Security → Full Disk Access)

### 1. Install dependencies

```sh
bun install
```

### 2. Configure environment

```sh
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `WHOOP_CLIENT_ID` | From [developer.whoop.com](https://developer.whoop.com/) |
| `WHOOP_CLIENT_SECRET` | From your Whoop app registration |
| `WHOOP_REDIRECT_URI` | Set to `http://localhost:3000/callback` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `IMESSAGE_RECIPIENT` | Phone number to send messages to |
| `MORNING_MESSAGE_CRON` | Cron schedule (default: `0 7 * * *`) |
| `AI_MODEL` | Claude model ID (default: `claude-haiku-4-5-20251001`) |

When registering your Whoop app, set the redirect URI to `http://localhost:3000/callback`.

### 3. Authorize with Whoop

```sh
bun run auth
```

Open the printed URL in your browser, log in to Whoop, and grant access. Tokens are saved to `data/whoop-tokens.json`.

### 4. Run

```sh
bun run start
```

## Usage tips

**Use a different phone number.** The bot sends and receives on your Mac's iMessage account. If you set `IMESSAGE_RECIPIENT` to your own number, you'll be texting yourself — which works, but can cause echo issues. It's better to text the bot *from a different number* (a friend's phone, a secondary number, etc.) and set `IMESSAGE_RECIPIENT` to that number.

**Missed morning messages.** If your Mac was asleep at the scheduled time, the bot sends a belated morning message when it starts up.

**Swap AI models.** Set `AI_MODEL` in `.env` to `claude-sonnet-4-5-20250929` for better personality, or stick with Haiku for speed and cost.

## Tests

```sh
bun test
```
