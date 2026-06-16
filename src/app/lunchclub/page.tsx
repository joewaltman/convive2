import type { Metadata } from 'next';
import { LandingHero } from '@/components/lunchclub/LandingHero';
import { SignupForm } from '@/components/lunchclub/SignupForm';
import {
  getDistinctAgeRanges,
  getDistinctDietaryRestrictions,
} from '@/lib/lunchclub/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lunch Club',
  description:
    'Small lunches. Good company. Real conversation. Sign up for a weekday lunch with five or six people.',
};

export default async function LunchClubLandingPage() {
  const [ageRangeOptions, dietaryOptions] = await Promise.all([
    getDistinctAgeRanges(),
    getDistinctDietaryRestrictions(),
  ]);
  return (
    <div className="space-y-12">
      <LandingHero />
      <SignupForm
        source="organic"
        prefill={null}
        hideWhoFor={false}
        ageRangeOptions={ageRangeOptions}
        dietaryOptions={dietaryOptions}
      />
    </div>
  );
}
