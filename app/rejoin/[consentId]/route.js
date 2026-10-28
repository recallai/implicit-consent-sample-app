import { consents } from '../../../lib/consent.js';
import { createBot } from '../../../lib/create-bot.js';

export function GET() {
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rejoin meeting</title></head>
<body style="font-family:system-ui;max-width:580px;margin:80px auto;padding:24px">
  <h1>Rejoin meeting</h1>
  <p id="message" role="status">Sending a new bot to the meeting…</p>
  <button id="retry" hidden onclick="rejoin()">Try again</button>
  <script>
    async function rejoin() {
      const message = document.getElementById('message');
      const retry = document.getElementById('retry');
      retry.hidden = true;
      try {
        const response = await fetch(location.pathname, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || JSON.stringify(result));
        message.textContent = 'A new bot has been sent to the meeting.';
      } catch (error) {
        message.textContent = error.message;
        retry.hidden = false;
      }
    }
    rejoin();
  </script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request, { params }) {
  const { consentId } = await params;
  const consent = consents.get(consentId);
  if (!consent?.meetingUrl) return Response.json({ error: 'This rejoin link has expired. Send a bot from the terminal instead.' }, { status: 404 });

  try {
    // One replacement bot per link, including repeated clicks.
    consent.rejoinRequest ??= createBot(consent.meetingUrl);
    const { bot, status } = await consent.rejoinRequest;
    if (status >= 400) consent.rejoinRequest = null;
    return Response.json(bot, { status });
  } catch (error) {
    consent.rejoinRequest = null;
    console.error(error.message);
    return Response.json({ error: error.message }, { status: 502 });
  }
}
