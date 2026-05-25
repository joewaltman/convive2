import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getVenueById } from '@/lib/venues';
import VenueForm from '../VenueForm';

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) notFound();
  const venue = await getVenueById(n);
  if (!venue) notFound();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit venue: {venue.name}</h1>
      <VenueForm venue={venue} />
    </div>
  );
}
