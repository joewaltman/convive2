import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · Con-Vive',
};

const EFFECTIVE_DATE = 'May 29, 2026';

export default function TermsPage() {
  return (
    <main className="bg-bone min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="heading-3 text-ink">
            Con-Vive
          </Link>
          <Link
            href="/"
            className="body-sm text-terracotta hover:text-terracotta-dark transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="eyebrow mb-4">Legal</p>
        <h1 className="heading-display mb-4">Terms of Service</h1>
        <p className="body-sm text-warm-gray mb-12">Effective {EFFECTIVE_DATE}</p>

        <Section title="1. Who we are">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and{' '}
            <strong>Con-Vive Dinners Inc.</strong> (&ldquo;Con-Vive&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;), operating from San Diego, California. Con-Vive
            organizes small dinners for university alumni chapters. By booking a seat,
            joining a waitlist, or otherwise using our website, you agree to these Terms.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            Dinners are open to guests who are at least <strong>21 years of age</strong>{' '}
            and able to enter into a binding contract. Alcohol may be served at any
            dinner; by booking, you confirm you meet the age requirement and will comply
            with all applicable laws while attending.
          </p>
        </Section>

        <Section title="3. Booking and payment">
          <p>
            Seats are reserved on a first-come basis and are charged in full at the time
            of booking through our payment processor, Stripe. Prices shown include the
            cost of the meal as described on the dinner detail page; gratuity, additional
            beverages, and travel to and from the venue are your responsibility unless
            stated otherwise.
          </p>
        </Section>

        <Section title="4. Cancellations and refunds">
          <p>
            We understand plans change. Our refund policy is straightforward:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>More than 48 hours before the dinner&apos;s start time:</strong>{' '}
              you may cancel for a full refund using the cancellation link in your
              confirmation email. Refunds are processed manually within two business
              days and typically appear on your card within 5&ndash;10 business days.
            </li>
            <li>
              <strong>Within 48 hours of the dinner&apos;s start time, or for a no-show:</strong>{' '}
              no refund and no credit toward future dinners is provided. Our venue and
              seat commitments are made on your behalf well before the meal, and those
              costs are not recoverable inside that window.
            </li>
            <li>
              <strong>If we cancel or reschedule the dinner</strong> (for example, due
              to low turnout or a venue issue), you will receive a full refund or, at
              your option, transfer your payment to a future dinner.
            </li>
          </ul>
        </Section>

        <Section title="5. No seat transfers">
          <p>
            Your reservation is tied to the name on the booking and is not transferable
            to another person. We rely on knowing who is at the table to seat people
            thoughtfully and to keep the experience safe. If you cannot attend, please
            cancel under Section 4 rather than sending someone in your place.
          </p>
        </Section>

        <Section title="6. Waitlist and seat claims">
          <p>
            When a dinner is full, you may join the waitlist. If a seat opens, we email
            the next person in line a claim link that is valid for 24 hours. If you do
            not complete payment in that window, the seat is offered to the next person.
            Joining the waitlist does not guarantee a seat.
          </p>
        </Section>

        <Section title="7. Conduct at dinners">
          <p>
            Our dinners are small, table-based gatherings. We ask all guests to be
            respectful of one another, the venue, and the venue&apos;s staff. We reserve
            the right to refuse service to, or remove from a dinner, any guest whose
            behavior is unsafe, harassing, or significantly disruptive. No refund is
            provided in those cases.
          </p>
        </Section>

        <Section title="8. Allergies and dietary needs">
          <p>
            We collect dietary information at booking and share it with venues as part
            of menu planning. Venues use shared kitchens and we cannot guarantee an
            allergen-free environment. If you have a severe allergy, please email us
            before booking so we can confirm the venue can safely accommodate you.
          </p>
        </Section>

        <Section title="9. Photos">
          <p>
            By attending a dinner, you consent to being incidentally included in photos
            taken at the event and to your alumni chapter (and Con-Vive) using those
            photos for recap emails, social posts, and similar non-commercial purposes.
            If you prefer not to be photographed, email us at{' '}
            <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
              joe@con-vive.com
            </a>{' '}
            in advance and we will let the table know.
          </p>
        </Section>

        <Section title="10. Privacy">
          <p>
            We use the information you provide only to run the dinners and communicate
            with you about them. See our{' '}
            <Link href="/privacy" className="text-terracotta hover:underline">
              Privacy Policy
            </Link>{' '}
            for details.
          </p>
        </Section>

        <Section title="11. Assumption of risk">
          <p>
            You attend dinners voluntarily. Con-Vive is not a restaurant, bar, or
            transportation provider; we coordinate gatherings hosted at third-party
            venues. You assume the ordinary risks of dining out, including food allergens,
            alcohol consumption, travel to and from the venue, and interactions with
            other guests.
          </p>
        </Section>

        <Section title="12. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Con-Vive will not be liable for any
            indirect, incidental, special, consequential, or punitive damages, or any
            loss of profits or revenues, whether incurred directly or indirectly. Our
            total liability for any claim arising out of or relating to these Terms or a
            dinner is limited to the amount you paid us for the dinner in question.
          </p>
        </Section>

        <Section title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. When we do, we will update the
            effective date at the top of this page. Material changes will be highlighted
            in your next confirmation email. Continued use of the site after a change
            means you accept the updated Terms.
          </p>
        </Section>

        <Section title="14. Governing law and venue">
          <p>
            These Terms are governed by the laws of the State of California, without
            regard to its conflict-of-laws rules. Any dispute arising out of or relating
            to these Terms or a dinner will be brought exclusively in the state or
            federal courts located in San Diego County, California, and you consent to
            the personal jurisdiction of those courts.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            Questions about these Terms? Email{' '}
            <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
              joe@con-vive.com
            </a>
            .
          </p>
        </Section>
      </article>

      <footer className="py-8 bg-surface border-t border-border">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <p className="body-sm text-warm-gray">
            &copy; {new Date().getFullYear()} Con-Vive Dinners Inc.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="body-sm text-warm-gray hover:text-terracotta">
              Privacy Policy
            </Link>
            <Link href="/terms" className="body-sm text-warm-gray hover:text-terracotta">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="heading-2 mb-4">{title}</h2>
      <div className="body-base text-body space-y-4">{children}</div>
    </section>
  );
}
