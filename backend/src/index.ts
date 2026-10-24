// Entry point. Run: npm run backend        serve the API and poll in the background
//                  npm run backend:poll    poll once, print a summary, exit
import { readFileSync } from 'node:fs';
import { config } from './config';
import { pollOnce, startPolling } from './poller';
import { createApp } from './server';
import { Store } from './store';
import type { Offer } from './types';

const log = (line: string) => console.log(`${new Date().toISOString()} ${line}`);

async function main() {
  // The backend reads the generated data/ folder, never the site's TypeScript.
  const offers = JSON.parse(readFileSync('data/offers.json', 'utf8')) as Offer[];
  const store = new Store(config.storeDir);

  if (process.argv.includes('--once')) {
    const summary = await pollOnce({ offers, store, log });
    process.exit(summary.failureRate > config.unhealthyRate ? 1 : 0);
  }

  const server = createApp({ store, offers }).listen(config.port, () => log(`listening on :${config.port}, ${offers.length} offers`));
  const stop = config.polling ? startPolling({ offers, store, log }) : () => {};

  const shutdown = () => {
    stop();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
