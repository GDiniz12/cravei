import cron from 'node-cron';
import { runMatchSync } from '../scripts/syncMatches';

let isRunning = false;

const syncSafely = async () => {
  if (isRunning) {
    console.warn('Match sync already in progress, skipping this tick.');
    return;
  }
  isRunning = true;
  try {
    await runMatchSync();
  } catch (error) {
    console.error('Scheduled match sync failed:', error);
  } finally {
    isRunning = false;
  }
};

// Every 20 minutes. The full sync loop only makes ~6 requests (one per
// tracked league) 6.5s apart, well under football-data.org's free-tier
// limit of 10 requests/minute, so this cadence keeps scores/status fresh
// without users ever having to trigger `npm run sync:matches` by hand.
export const startMatchSyncJob = () => {
  cron.schedule('*/20 * * * *', syncSafely);
  console.log('Match sync job scheduled: every 20 minutes.');

  // Also run once at startup so freshly deployed instances don't wait
  // 20 minutes for their first sync.
  syncSafely();
};
