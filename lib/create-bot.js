import { BOT_NAME, optOutMessage } from './recall.js';
import { consents } from './consent.js';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export async function createBot(meetingId) {
  let meetingUrl = meetingId.trim();

  // Recall needs a full URL. Expand Google Meet codes and numeric Zoom IDs.
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(meetingUrl)) {
    meetingUrl = `https://meet.google.com/${meetingUrl}`;
  } else if (/^[\d -]+$/.test(meetingUrl)) {
    meetingUrl = `https://zoom.us/j/${meetingUrl.replace(/\D/g, '')}`;
  }

  const consentId = randomUUID();
  const message = optOutMessage(consentId, meetingUrl);
  const directory = path.join(process.cwd(), 'status images', 'recording');
  const filename = (await readdir(directory)).sort().find((name) => /\.jpe?g$/i.test(name));
  let automaticVideoOutput;
  if (filename) {
    const image = await readFile(path.join(directory, filename));
    automaticVideoOutput = {
      in_call_recording: { kind: 'jpeg', b64_data: image.toString('base64') },
    };
  }

  const response = await fetch(`https://${process.env.RECALL_REGION}.recall.ai/api/v1/bot/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.RECALL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: BOT_NAME,
      chat: {
        on_bot_join: { send_to: 'everyone', message },
        on_participant_join: { exclude_host: false, message },
      },
      recording_config: {
        participant_events: {},
        realtime_endpoints: [{
          type: 'webhook',
          url: process.env.RECALL_WEBHOOK_URL,
          events: ['participant_events.chat_message'],
        }],
      },
      automatic_video_output: automaticVideoOutput,
    }),
  });

  const bot = await response.json();
  if (response.ok) consents.set(consentId, { consentId, botId: bot.id, meetingUrl });
  return { bot, status: response.status };
}
