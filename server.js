import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';
import next from 'next';

const port = Number(process.env.PORT || 3000);
const app = next({ dev: process.env.NODE_ENV !== 'production', port });
await app.prepare();

const server = createServer(app.getRequestHandler());
server.listen(port, async () => {
  console.log(`Backend running at http://localhost:${port}`);
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.on('SIGINT', () => process.exit(0));
  const meetingId = await terminal.question('Meeting URL or ID: ');
  terminal.close();

  try {
    const response = await fetch(`http://localhost:${port}/api/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    });
    const result = await response.json();
    console.log(response.ok ? `Bot sent. Bot ID: ${result.id}` : result);
  } catch (error) {
    console.error(error.message);
  }
});
