import { consents, refuseConsent } from '../../../lib/consent.js';

export function GET() {
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Refuse recording consent</title></head>
<body style="font-family:system-ui;max-width:580px;margin:80px auto;padding:24px">
  <h1>Refuse recording consent</h1>
  <p id="message" role="status">Refusing recording consent…</p>
  <button id="retry" hidden onclick="optOut()">Try again</button>
  <script>
    async function optOut() {
      const message = document.getElementById('message');
      const retry = document.getElementById('retry');
      retry.hidden = true;
      message.textContent = 'Refusing recording consent…';
      try {
        const response = await fetch(location.pathname, {
          method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        message.textContent = 'Recording consent was refused. The bot has been asked to leave because of your refusal. The recording will be deleted when the bot finishes. You can close this page.';
        window.close();
      } catch (error) {
        message.textContent = error.message;
        retry.hidden = false;
      }
    }
    optOut();
  </script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request, { params }) {
  const { consentId } = await params;
  const consent = consents.get(consentId);
  if (!consent) return Response.json({ error: 'This meeting link has expired. Send "opt out" in the meeting chat instead.' }, { status: 404 });

  try {
    await refuseConsent(consent, 'someone');
    return Response.json({ consentRefused: true, deletionPending: !consent.deleted });
  } catch (error) {
    console.error(error.message);
    return Response.json({ error: error.message }, { status: 502 });
  }
}
