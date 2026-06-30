import { requireSuperAdmin } from '@/lib/auth/admin';
import SystemView from './SystemView';

export default async function LunchClubSystemPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Manually run the lunch club cron jobs. The same jobs are triggered
          automatically by the booking-cron Railway service on their schedules.
        </p>
      </div>
      <SystemView />
    </div>
  );
}
