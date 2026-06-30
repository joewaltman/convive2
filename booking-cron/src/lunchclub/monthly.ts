import { triggerLunchclubCron } from './trigger';

triggerLunchclubCron('monthly').catch((err) => {
  console.error('[lunchclub:monthly] uncaught', err);
  process.exit(1);
});
