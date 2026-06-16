// Placeholder club name. Easy to swap when the real name is chosen.
export const CLUB_NAME = 'The Lunch Club';

interface Step {
  lead: string;
  body: string;
}

const STEPS: Step[] = [
  {
    lead: 'Start with a welcome lunch.',
    body: 'A relaxed weekday lunch with a friendly group. A warm, low-key way to meet a few people and see if it is for you.',
  },
  {
    lead: 'Then we seat you at your table.',
    body: 'From there we put you with a small group of six or so who meet for lunch once a month. The same faces each time, so you actually get to know each other.',
  },
  {
    lead: 'We handle everything else.',
    body: 'The invitations, the table, the reservation, the reminders. You just show up and enjoy lunch. There is nothing to plan and nothing to organize.',
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-8" aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className="heading-2">
        How it works
      </h2>

      <ol className="space-y-6">
        {STEPS.map((step, idx) => (
          <li key={idx} className="space-y-2">
            <p className="body-lg text-ink font-semibold">
              {idx + 1}. {step.lead}
            </p>
            <p className="body-lg text-body">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="body-lg text-ink font-medium border-l-4 border-terracotta pl-4">
        Your first invitation will be to a welcome lunch. Your regular table comes
        together from there.
      </p>

      <p className="body-lg text-body">
        Tell us a little about yourself below, so we can seat you with people you&apos;ll
        genuinely enjoy.
      </p>
    </section>
  );
}
