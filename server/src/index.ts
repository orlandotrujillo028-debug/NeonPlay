import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
await db.$connect();
const server = app.listen(config.PORT, '127.0.0.1', () =>
  console.log(`NeonPlay API: http://localhost:${config.PORT}`),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
