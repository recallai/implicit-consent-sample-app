# Implicit Recording Consent Sample App

This app shows how to send a Recall.ai bot to a meeting, disclose recording in chat, and let participants opt out with two different methods: one-click opt out with a link, and through the meeting chat.

## What you can do

- Send a bot to a meeting by entering its URL or ID in the terminal.
- Display a recording notification JPEG while the bot is recording.
- Send recording disclosure and opt-out instructions when the bot joins and when participants join.
- Refuse recording through a chat link or by sending `opt out` in meeting chat.
- Announce the refusal, leave the meeting, and delete the recordings after the bot finishes.
- Send a replacement bot to the same meeting through the rejoin link in the leave message.

## Run the example

You need Node.js **20.9 or newer**, npm, [ngrok](https://ngrok.com/download), and a Recall account with an API key in your chosen [region](https://docs.recall.ai/v1.11/docs/regions).

For faster setup, [install the Recall.ai MCP](https://docs.recall.ai/docs/mcp) in your AI coding assistant. It gives your assistant access to Recall documentation and workspace data so it can help you configure the integration and troubleshoot issues.

### 1. Configure Recall and a public URL

Use the same Recall region for your API key, dashboard, bots, and recordings.

Choose a stable ngrok domain for the backend. In your region's Recall dashboard, add a workspace webhook pointing to:

```text
https://YOUR_STATIC_DOMAIN.ngrok-free.dev/api/webhook
```

Subscribe it to these lifecycle events:

- `bot.in_call_recording`
- `bot.done`
- `bot.fatal`

Register the URL you will use and save it in `.env` as described below.

Chat messages are configured separately in each Create Bot request through `recording_config.realtime_endpoints`, subscribing to `participant_events.chat_message`. These events arrive at the same backend endpoint but are not workspace dashboard subscriptions. See [Receiving Chat Messages](https://docs.recall.ai/docs/receiving-chat-messages).

### 2. Set environment variables

Copy the sample file, then replace the placeholders using its comments:

```bash
cp .env.sample .env
```

The required values are:

```dotenv
RECALL_API_KEY=your_recall_api_key
RECALL_REGION=us-east-1
PUBLIC_API_BASE_URL=https://YOUR_STATIC_DOMAIN.ngrok-free.dev
RECALL_WEBHOOK_URL=https://YOUR_STATIC_DOMAIN.ngrok-free.dev/api/webhook
```

| Variable | Purpose | Required? | Default when unset or empty |
| --- | --- | --- | --- |
| `RECALL_API_KEY` | Recall workspace API key for the selected region. | Yes | None |
| `RECALL_REGION` | Recall region used for all API requests. | Yes | None |
| `PUBLIC_API_BASE_URL` | Public backend base URL used to build opt-out and rejoin links. | Yes | None |
| `RECALL_WEBHOOK_URL` | Full public URL of this app's `/api/webhook` endpoint. | Yes | None |
| `PORT` | Local server port, supplied in the shell when starting the app. | No | `3000` |

Both public URL variables must point to the app receiving ngrok traffic. If the domain changes, update both values, update the workspace webhook, and create a new bot so its links and realtime endpoint use the new address.

To change the local port, use `PORT=8000 npm run dev` and point ngrok to that port. The custom server selects its port before Next.js loads `.env`, so setting `PORT` only in `.env` does not change the listening port.

### 3. Start the backend and tunnel

From this directory, run:

```bash
npm install
npm run dev
```

The backend listens on [localhost:3000](http://localhost:3000) and asks:

```text
Meeting URL or ID:
```

In another terminal, start the tunnel before submitting the meeting:

```bash
ngrok http 3000 --url=YOUR_STATIC_DOMAIN.ngrok-free.dev
```

Use the domain saved in `.env` and forward it to the port where this backend is running (port `3000` by default).

Paste a full meeting URL, a Google Meet code such as `abc-defg-hij`, or a numeric Zoom meeting ID, then press Enter. Use the full Zoom invite link when a passcode is required. The terminal prints the bot ID or API error. A bot ID means the bot was created; it may still need admission to the call.

Keep the backend and ngrok running throughout the meeting and any recording deletion. Press Ctrl+C in each terminal to stop them.

## Test the integration

1. Join a test meeting. Start this app and its ngrok tunnel, then enter the meeting link at the terminal prompt.
2. Admit the bot if the meeting has a waiting room, and grant any recording permission required by the meeting platform.
3. Confirm the bot is named **bot**, its camera shows the recording image when recording starts, and its chat message contains **you can opt out here**. Instructions are also sent when participants join.
4. Open the opt-out link. The page automatically submits the refusal without asking for a name, then attempts to close. If the browser keeps it open, it shows the result.
5. Confirm the bot announces **Recording consent was refused by someone**, explains that it is leaving because consent was refused, says the recording will be deleted, and includes **Rejoin the meeting**. The bot then leaves.
6. Keep the app and tunnel running until the terminal reports `Recording deletion completed for bot:`. The `bot.done` webhook triggers deletion of each recording belonging to the refused bot.
7. Click **Rejoin the meeting**. The page sends a replacement bot to the same meeting and shows **A new bot has been sent to the meeting.** Admit the replacement if needed.
8. In the meeting chat, send `opt out`. This time, the refusal notice uses the sender's meeting display name. The bot leaves and its recordings are deleted through the same webhook flow.

You can also send `opt-out` or include the phrase in a longer message. Matching is case insensitive.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Opt-out links or chat webhooks do not reach the backend. | Confirm ngrok forwards to this backend's port (`3000` by default), and both public URL variables use that tunnel's domain. |
| An opt-out or rejoin link has expired. | Meeting links are held in memory. Restarting the backend clears them. Create a new bot and use its new links. |
| Recall rejects requests or the expected bot is missing. | Confirm the API key, `RECALL_REGION`, and dashboard all refer to the same region. |
| The opt-out page stays open after success. | Browsers may block `window.close()`. The request has completed if the page shows the success message; close it manually. |
| A recording has not been deleted after refusal. | Keep the backend and tunnel running. Confirm the workspace webhook includes `bot.done` and reaches `/api/webhook`. A deletion failure returns HTTP 500 so Recall can retry. |
| A status image does not appear. | Put a `.jpg` or `.jpeg` in `status images/recording/` before creating the bot. The app uses the first JPEG alphabetically. |

## What happens when the bot joins

1. **The terminal submits the meeting.** `server.js` sends the entered URL or ID to `POST /api/bot`.
2. **The backend creates a bot.** `createBot()` normalizes supported meeting IDs, loads the recording JPEG, generates an opt-out link, and sends the Create Bot request to Recall.
3. **The bot shares the disclosure.** Its automatic chat configuration sends recording and opt-out instructions on bot join and participant join. Recall displays the supplied camera image while the bot is recording.
4. **Participants can refuse.** Opening the link posts to `/opt-out/[consentId]`. Sending `opt out` in chat produces a realtime event at `/api/webhook`. Both paths call `refuseConsent()`.
5. **The backend announces the refusal and requests departure.** Link refusals use **someone**; chat refusals use the sender's display name. The notice includes a rejoin link.
6. **The backend deletes the recordings.** After Recall sends `bot.done`, the app retrieves the bot's recordings and issues a Delete Recording request for each one.

## Recall endpoints powering the app

All Recall requests use `https://{RECALL_REGION}.recall.ai` and the workspace API key in the `Authorization` header.

| Recall endpoint | Used for | App entry point |
| --- | --- | --- |
| [POST `/api/v1/bot/`](https://docs.recall.ai/reference/bot_create) | Create the initial bot or a replacement with disclosure, opt-out instructions, realtime chat events, and the recording image. | `createBot()` in `lib/create-bot.js` |
| [POST `/api/v1/bot/{id}/send_chat_message/`](https://docs.recall.ai/reference/bot_send_chat_message_create) | Announce who refused, why the bot is leaving, and that the recording will be deleted; include the rejoin link. | `refuseConsent()` in `lib/consent.js` |
| [POST `/api/v1/bot/{id}/leave_call/`](https://docs.recall.ai/reference/bot_leave_call_create) | Remove the bot after the refusal notice is sent. | `refuseConsent()` |
| [GET `/api/v1/bot/{id}/`](https://docs.recall.ai/reference/bot_retrieve) | Retrieve the recordings belonging to the refused bot. | `deleteRecordings()` |
| [DELETE `/api/v1/recording/{id}/`](https://docs.recall.ai/reference/recording_destroy) | Delete each recording after `bot.done`. | `deleteRecordings()` |

Workspace lifecycle webhooks and per-bot realtime chat events both arrive at `POST /api/webhook`. `GET /api/webhook` provides a basic receiver health check.

## Recording and consent behavior

**Recording:** The app supplies a recording configuration when creating the bot and uses Recall's default recording start behavior. It announces recording and provides a way to refuse.

**Refusal:** `GET /opt-out/[consentId]` serves a page that automatically calls `POST` on the same path. No request body or name is needed. Chat refusals use the sender's meeting display name, with a fallback for unnamed participants. The handler ignores the bot's own disclosure messages.

**Departure and deletion:** The chat notice is sent before the leave request. Previously captured media is not deleted by leaving alone; the app waits for `bot.done` and explicitly deletes each recording. Repeated refusal requests share the same operation. If leaving fails after the notice was sent, retry repeats only the leave request. See [Delete Recording](https://docs.recall.ai/reference/recording_destroy).

**Rejoining:** `GET /rejoin/[consentId]` serves a page that automatically calls `POST` on the same path. The backend creates one replacement bot with the original meeting URL, the same configuration, and a fresh opt-out link. Repeated clicks on the old rejoin link return the same replacement bot. Deletion after the original refusal applies to the original bot's recordings.

**Chat links:** Zoom and Teams receive labeled links. Google Meet receives the label followed by a plain URL because it does not support formatted chat links. See [Sending Chat Messages](https://docs.recall.ai/docs/sending-chat-messages).

**State:** Meeting links, refusal operations, pending deletions, and replacement bot requests are held in memory. Restarting the backend clears them. Keep the process running until the meeting and any deletion requests finish.

## Recording image

| File | Displayed when |
| --- | --- |
| `status images/recording/status.jpg` | The bot is recording. |

Use JPEGs with a 16:9 aspect ratio, ideally **1280 × 720**, under **1.3 MB**. The supplied image keeps its content within a centered **600 × 500 px** area and includes the note **to opt out, view chat message**. See [Outputting Images/Video From a Bot's Camera/Screenshare](https://docs.recall.ai/docs/output-video-in-meetings).

The app reads the first JPEG alphabetically from `status images/recording/`, encodes it as base64, and includes it in `automatic_video_output.in_call_recording` when creating a bot. If the folder is empty, image output is omitted. Replacing the image affects the next bot you create.
