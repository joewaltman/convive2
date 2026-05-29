import Image from 'next/image';
import { ChapterLeadForm } from './_components/ChapterLeadForm';

export default async function HomePage() {
  const calendlyUrl = process.env.CALENDLY_URL || 'https://calendly.com/joewaltman/15min';

  return (
    <main className="bg-bone min-h-screen">
      {/* Minimal top bar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="heading-3 text-ink">Con-Vive</span>
          <a
            href="#chapter-interest"
            className="body-sm text-terracotta hover:text-terracotta-dark transition-colors"
          >
            Talk to us
          </a>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 items-center">
            <div className="md:col-span-3">
              <h1 className="heading-display mb-6">
                A turnkey dinner program for your alumni chapter.
              </h1>
              <p className="body-lg text-body max-w-2xl mb-8">
                We handle venue partnerships, scheduling, payments, and guest
                communications. You get engaged alumni and deeper connections, without
                the logistics.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#chapter-interest"
                  className="inline-block bg-terracotta text-white px-6 py-3 rounded-sm body-base font-medium hover:bg-terracotta-dark transition-colors"
                >
                  Talk to us
                </a>
                <a
                  href="#how-it-works"
                  className="inline-block border border-ink text-ink px-6 py-3 rounded-sm body-base font-medium hover:bg-surface transition-colors"
                >
                  How it works
                </a>
              </div>
            </div>
            <div className="md:col-span-2">
              <Image
                src="/dinner-party.jpg"
                alt="Alumni gathered around a dinner table"
                width={2736}
                height={4100}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. The problem */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-4">Why this exists</p>
          <div className="max-w-3xl">
            <p className="body-lg text-body mb-6">
              Chapter volunteers are stretched thin. Between work and family, coordinating
              events falls to whoever has time. Most chapters default to happy hours or
              large mixers because they are simple to organize, even if they do not create
              lasting connections.
            </p>
            <p className="body-lg text-body">
              Small dinners are different. Eight to twelve people around a table, with
              intentional seating and a shared meal. Alumni leave knowing a few new people
              by name. But dinners require venue relationships, payment handling, and
              careful logistics. That is where we come in.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how-it-works" className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="heading-1 mb-12">Four steps. We handle the work.</h2>
          <div className="grid gap-8 max-w-3xl">
            <Step number={1} title="We determine a dinner cadence">
              We work together to identify the right time and locations for dinners for
              your members, taking advantage of our existing venue partnerships.
            </Step>
            <Step number={2} title="We set up your chapter page">
              Your alumni see a page with upcoming dinners in your school colors, with
              your chapter name.
            </Step>
            <Step number={3} title="You share the page with your alumni">
              Drop the link in your newsletter, group chat, or social media. We handle
              everything from there.
            </Step>
            <Step number={4} title="We run the dinners">
              Venue coordination, payments, confirmations, reminders, cancellations,
              waitlists. Your members just show up and enjoy.
            </Step>
          </div>
          <p className="body-base text-warm-gray mt-10 italic">
            Your chapter brand stays front and center. Members never see Con-Vive.
          </p>
        </div>
      </section>

      {/* 5. About Joe */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-4">Why we exist</p>
          <h2 className="heading-1 mb-12">More tables, fewer mixers.</h2>
          <div className="max-w-3xl">
            <p className="body-lg text-body mb-6">
              The best alumni connections rarely happen at a packed happy hour. They happen
              at a table of eight, over a long dinner, with people you might not have met
              otherwise. But those dinners are also the hardest events to organize, and
              that is exactly why most chapters default to easier formats.
            </p>
            <p className="body-lg text-body mb-6">
              Con-Vive exists to change that. We have built a platform that handles every
              piece of the operation, including venues, scheduling, payments, reminders,
              and waitlists, so chapter leaders can produce a steady cadence of small
              dinners without the overhead. Your members get the experience. Your chapter
              gets the credit.
            </p>
            <p className="body-base text-warm-gray">
              Reach us at{' '}
              <a
                href="mailto:joe@con-vive.com"
                className="text-terracotta hover:underline"
              >
                joe@con-vive.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-4">Questions</p>
          <h2 className="heading-1 mb-12">Things chapter heads ask.</h2>
          <div className="max-w-3xl space-y-4">
            <FaqItem question="What does this cost our chapter?">
              Nothing. Chapters pay no fees, no subscription, no revenue share. Guests pay
              per seat, and that covers the venue and our operating costs.
            </FaqItem>
            <FaqItem question="Who actually runs the dinners?">
              We do. Our team handles venue coordination, payments, guest communications,
              confirmations, and reminders. Your volunteers do not need to manage anything
              on the day of.
            </FaqItem>
            <FaqItem question="What if not enough members book?">
              We work with you to set realistic expectations and timing. If a dinner does
              not fill, we can reschedule or cancel without cost to your chapter.
            </FaqItem>
            <FaqItem question="Where do you operate?">
              Currently San Diego. We are expanding to other cities based on demand. If you
              are outside San Diego, let us know and we will keep you posted.
            </FaqItem>
            <FaqItem question="What happens to member data?">
              Member information is used only to run the dinners. We do not sell or share
              it. You can request a full data export or deletion at any time.
            </FaqItem>
            <FaqItem question="Can we co-brand the page?">
              Yes. Your chapter page shows your chapter name and school colors. There is no
              Con-Vive branding visible to your members.
            </FaqItem>
            <FaqItem question="Will we know who attended?">
              Yes. After each dinner, we can provide a summary of attendees (names and
              graduation years) so you know who is engaging with the program.
            </FaqItem>
            <FaqItem question="How do refunds work?">
              If a member needs to cancel, they can do so from their confirmation email.
              We process refunds manually within two business days for qualifying
              cancellations.
            </FaqItem>
          </div>
        </div>
      </section>

      {/* 8. Talk to us */}
      <section id="chapter-interest" className="py-24 md:py-32 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-4">Let us talk</p>
          <h2 className="heading-1 mb-12">Tell us about your chapter.</h2>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="bg-surface p-6 rounded-sm">
              <ChapterLeadForm />
            </div>
            <div className="max-w-md">
              <p className="body-lg text-body mb-6">
                Or grab time directly on my calendar. I am happy to walk through how
                Con-Vive works and answer any questions.
              </p>
              <a
                href={calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-terracotta text-terracotta px-6 py-3 rounded-sm body-base font-medium hover:bg-terracotta hover:text-white transition-colors"
              >
                Schedule a call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-12 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="heading-3 text-ink mb-2">Con-Vive</p>
              <p className="body-sm text-warm-gray">
                A turnkey dinner program for alumni chapters.
              </p>
              <p className="body-sm text-warm-gray mt-2">San Diego, CA</p>
            </div>
            <div>
              <p className="body-sm font-semibold text-ink mb-2">Navigation</p>
              <ul className="space-y-1">
                <li>
                  <a href="#how-it-works" className="body-sm text-warm-gray hover:text-terracotta">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#chapter-interest" className="body-sm text-warm-gray hover:text-terracotta">
                    Talk to us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="body-sm font-semibold text-ink mb-2">Contact</p>
              <a
                href="mailto:joe@con-vive.com"
                className="body-sm text-warm-gray hover:text-terracotta"
              >
                joe@con-vive.com
              </a>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-wrap justify-between items-center gap-4">
            <p className="body-sm text-warm-gray">
              &copy; {new Date().getFullYear()} Con-Vive. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="/privacy" className="body-sm text-warm-gray hover:text-terracotta">
                Privacy Policy
              </a>
              <a href="/terms" className="body-sm text-warm-gray hover:text-terracotta">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center body-base font-semibold">
        {number}
      </div>
      <div>
        <h3 className="heading-3 mb-2">{title}</h3>
        <p className="body-base text-body">{children}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group border border-border rounded-sm">
      <summary className="cursor-pointer p-4 body-base font-medium text-ink flex justify-between items-center list-none">
        {question}
        <span className="text-warm-gray group-open:rotate-180 transition-transform">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </summary>
      <div className="px-4 pb-4 body-base text-body">
        {children}
      </div>
    </details>
  );
}
