import { triggerLunchclubCron } from './trigger';

triggerLunchclubCron('day-before').catch((err) => {
  console.error('[lunchclub:day-before] uncaught', err);
  process.exit(1);
});
