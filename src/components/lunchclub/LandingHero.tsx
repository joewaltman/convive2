import { CLUB_NAME, HowItWorks } from './HowItWorks';

export function LandingHero() {
  return (
    <div className="space-y-12">
      <header className="space-y-6">
        <h1 className="heading-display">{CLUB_NAME}</h1>
        <p className="body-lg text-body">
          A standing monthly lunch with good company. The same small group, the same
          table, once a month.
        </p>
      </header>
      <HowItWorks />
    </div>
  );
}
