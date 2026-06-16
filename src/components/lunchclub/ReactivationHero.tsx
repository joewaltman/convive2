export interface ReactivationHeroProps {
  firstName: string | null;
}

export function ReactivationHero({ firstName }: ReactivationHeroProps) {
  const name = firstName && firstName.trim().length > 0 ? firstName.trim() : 'there';
  return (
    <header className="space-y-4">
      <p className="eyebrow">WELCOME BACK</p>
      <h1 className="heading-1">Welcome back, {name}.</h1>
      <p className="body-lg text-body">
        Good to see you. We have your earlier answers below, so you only need to fill
        in what is new. Anything you change here will replace what we had on file.
      </p>
    </header>
  );
}
