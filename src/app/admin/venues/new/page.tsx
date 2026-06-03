import { requireSuperAdmin } from '@/lib/auth/admin';
import VenueForm from '../VenueForm';

export default async function NewVenuePage() {
  await requireSuperAdmin();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New venue</h1>
      <VenueForm photos={[]} />
    </div>
  );
}
