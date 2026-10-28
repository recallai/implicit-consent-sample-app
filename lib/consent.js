import { botAction, refusalMessage } from './recall.js';

// Share the sample app's meeting links between Next.js routes. Restarting clears them.
export const consents = globalThis.meetingConsents ??= new Map();

export function consentForBot(botId) {
  let consent = [...consents.values()].find((entry) => entry.botId === botId);
  if (!consent) {
    consent = { consentId: botId, botId };
    consents.set(botId, consent);
  }
  return consent;
}

export async function refuseConsent(consent, participantName) {
  // Repeated clicks and webhook retries share the same request.
  if (consent.request) return consent.request;
  consent.refusedBy ??= participantName?.trim() || 'an unnamed participant';
  consent.request = (async () => {
    if (!consent.notified) {
      await botAction(consent.botId, 'send_chat_message', { to: 'everyone', message: refusalMessage(consent.refusedBy, consent.consentId, consent.meetingUrl) });
      consent.notified = true;
    }
    // bot.done will trigger deletion once the bot has finished.
    await botAction(consent.botId, 'leave_call');
    console.log('Consent refused; bot asked to leave:', consent.botId);
  })();

  try {
    await consent.request;
  } catch (error) {
    consent.request = null;
    throw error;
  }
}

export async function deleteRecordings(consent) {
  if (consent.deleted) return;
  const headers = { Authorization: `Token ${process.env.RECALL_API_KEY}` };
  const baseUrl = `https://${process.env.RECALL_REGION}.recall.ai/api/v1`;
  const response = await fetch(`${baseUrl}/bot/${consent.botId}/`, { headers });
  if (!response.ok) throw new Error(`Could not retrieve recordings (${response.status})`);
  const bot = await response.json();

  for (const recording of bot.recordings) {
    const deletion = await fetch(`${baseUrl}/recording/${recording.id}/`, { method: 'DELETE', headers });
    // A recording that was already deleted needs no further action.
    if (!deletion.ok && deletion.status !== 404) {
      throw new Error(`Could not delete recording ${recording.id} (${deletion.status})`);
    }
  }
  consent.deleted = true;
  console.log('Recording deletion completed for bot:', consent.botId);
}
