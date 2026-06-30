import { triggerLunchclubCron } from './trigger';

triggerLunchclubCron('below-floor').catch((err) => {
  console.error('[lunchclub:below-floor] uncaught', err);
  process.exit(1);
});
