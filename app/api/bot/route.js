import { createBot } from '../../../lib/create-bot.js';

export async function POST(request) {
  const { meetingId } = await request.json();
  const { bot, status } = await createBot(meetingId);
  return Response.json(bot, { status });
}
