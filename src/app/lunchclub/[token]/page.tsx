import { notFound } from 'next/navigation';
import { ReactivationHero } from '@/components/lunchclub/ReactivationHero';
import { SignupForm } from '@/components/lunchclub/SignupForm';
import {
  getProspectByToken,
  getDistinctAgeRanges,
  getDistinctDietaryRestrictions,
} from '@/lib/lunchclub/data';

export default async function LunchClubTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const prospect = await getProspectByToken(token);
  if (!prospect) {
    notFound();
  }
  const [ageRangeOptions, dietaryOptions] = await Promise.all([
    getDistinctAgeRanges(),
    getDistinctDietaryRestrictions(),
  ]);
  return (
    <div className="space-y-12">
      <ReactivationHero firstName={prospect.first_name} />
      <SignupForm
        source="reactivation"
        prefill={prospect}
        hideWhoFor
        ageRangeOptions={ageRangeOptions}
        dietaryOptions={dietaryOptions}
      />
    </div>
  );
}
