import { BOT_NAME } from '../../../lib/recall.js';
import { consents, consentForBot, refuseConsent, deleteRecordings } from '../../../lib/consent.js';

export function GET() {
  return Response.json({ message: 'Recall webhook is running' });
}

export async function POST(request) {
  const { event, data } = await request.json();
  if (event === 'bot.done') {
    const botId = data.bot?.id || data.bot_id;
    const consent = [...consents.values()].find((entry) => entry.botId === botId);
    if (consent?.refusedBy) {
      try {
        await deleteRecordings(consent);
      } catch (error) {
        console.error(error.message);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    return Response.json({ received: true });
  }

  if (event !== 'participant_events.chat_message') {
    console.log('Recall event:', event);
    return Response.json({ received: true });
  }

  const botId = data.bot.id;
  const participant = data.data.participant;
  // Teams chat can include HTML formatting.
  const text = data.data.data.text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').trim();

  if (participant.name === BOT_NAME || text.startsWith('This meeting is being recorded by Recall.ai.') || !/\bopt[\s-]+out\b/i.test(text)) {
    return Response.json({ received: true });
  }

  try {
    await refuseConsent(consentForBot(botId), participant.name);
    return Response.json({ received: true, consentRefused: true });
  } catch (error) {
    console.error(error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
