import { triggerLunchclubCron } from './trigger';

triggerLunchclubCron('nudge').catch((err) => {
  console.error('[lunchclub:nudge] uncaught', err);
  process.exit(1);
});
