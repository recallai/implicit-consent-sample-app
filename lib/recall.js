export const BOT_NAME = 'bot';
function meetingLink(path, label, meetingUrl) {
  const url = new URL(path, process.env.PUBLIC_API_BASE_URL).href;
  // Google Meet supports plain URLs; Zoom and Teams also support labeled links.
  const supportsLinks = /zoom\.us|teams\.(microsoft|live)\.com/.test(meetingUrl);
  return supportsLinks ? `<a href="${url}">${label}</a>` : `${label}: ${url}`;
}

export function refusalMessage(name, consentId, meetingUrl) {
  const link = meetingLink(`/rejoin/${consentId}`, 'Rejoin the meeting', meetingUrl);
  return `Recording consent was refused by ${name}. The bot is leaving the meeting because consent was refused. The recording will be deleted. ${link}`;
}

export function optOutMessage(consentId, meetingUrl) {
  const link = meetingLink(`/opt-out/${consentId}`, 'you can opt out here', meetingUrl);
  return `This meeting is being recorded by Recall.ai. To refuse recording consent, ${link}, or send "opt out" in chat. The bot will leave the meeting and the recording will be deleted.`;
}

export async function botAction(botId, action, body) {
  const response = await fetch(`https://${process.env.RECALL_REGION}.recall.ai/api/v1/bot/${botId}/${action}/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.RECALL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Recall ${action} failed (${response.status})`);
}
