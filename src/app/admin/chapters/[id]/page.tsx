import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getChapterById } from '@/lib/chapters';
import ChapterEditForm from './ChapterEditForm';

export default async function ChapterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) notFound();
  const chapter = await getChapterById(n);
  if (!chapter) notFound();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit chapter: {chapter.display_name}</h1>
      <ChapterEditForm chapter={chapter} />
    </div>
  );
}
