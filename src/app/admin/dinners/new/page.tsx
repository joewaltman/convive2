import { requireSuperAdmin } from '@/lib/auth/admin';
import { listAllChapters } from '@/lib/chapters';
import { listAllVenues } from '@/lib/venues';
import DinnerForm from '../DinnerForm';

export default async function NewDinnerPage() {
  await requireSuperAdmin();
  const [chapters, venues] = await Promise.all([listAllChapters(), listAllVenues()]);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New dinner</h1>
      <DinnerForm chapters={chapters} venues={venues} />
    </div>
  );
}
