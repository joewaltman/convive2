import { HowItWorks } from './HowItWorks';
import { formatDisplayName } from '@/lib/lunchclub/format';

export interface ReactivationHeroProps {
  firstName: string | null;
}

export function ReactivationHero({ firstName }: ReactivationHeroProps) {
  const name = formatDisplayName(firstName) || 'there';
  return (
    <div className="space-y-12">
      <header className="space-y-6">
        <h1 className="heading-1">Good to see you again, {name}.</h1>
        <p className="body-lg text-body">
          A while back you signed up to share a table with people you hadn&apos;t met
          yet. I&apos;m starting something new in that same spirit, a monthly lunch
          club, and you came to mind.
        </p>
      </header>
      <HowItWorks />
    </div>
  );
}
