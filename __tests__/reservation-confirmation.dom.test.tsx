/**
 * Test: Snapshot test of confirmation email
 *
 * Verifies:
 * - 3 calendar URLs present (Google, Outlook, .ics)
 * - Full address present (because reservation is confirmed)
 * - No em dashes (assert !/\u2014|\u2013/.test(html))
 * - No emojis
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReservationConfirmation from '@/emails/reservation-confirmation';

describe('ReservationConfirmation email', () => {
  const confirmedProps = {
    chapterDisplayName: 'Stanford Alumni',
    chapterAccent: '#8C1515',
    dinnerTitle: 'Fall 2026 Bay Area Dinner',
    dinnerStartsAt: new Date('2026-10-15T02:30:00.000Z'), // 7:30 PM PT Oct 14
    venueName: 'The Village Pub',
    fullAddress: '2967 Woodside Rd, Woodside, CA 94062',
    parkingNote: 'Valet parking available',
    menu: 'Three-course seasonal menu\nWine pairings included',
    bringsPartner: false,
    amountPaidDollars: '75.00',
    googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Stanford+Alumni+dinner',
    outlookUrl: 'https://outlook.live.com/calendar/0/deeplink/compose?subject=Stanford+Alumni+dinner',
    icsUrl: 'https://con-vive.com/api/calendar/token123.ics',
    cancelUrl: 'https://con-vive.com/cancel/token456',
  };

  test('renders confirmation email with all expected content', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));

    // 3 calendar URLs present
    expect(html).toContain('calendar.google.com');
    expect(html).toContain('outlook.live.com');
    expect(html).toContain('.ics');

    // Full address present (because confirmed)
    expect(html).toContain('2967 Woodside Rd');
    expect(html).toContain('Woodside, CA 94062');

    // Venue name
    expect(html).toContain('The Village Pub');

    // Parking note
    expect(html).toContain('Valet parking available');

    // Amount paid
    expect(html).toContain('$75.00');
  });

  test('no em dashes in output', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));

    // Check for em dash (U+2014) and en dash (U+2013)
    expect(html).not.toMatch(/\u2014|\u2013/);
  });

  test('no emojis in output', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));

    // Common emoji ranges
    // Basic emoji range: U+1F300 to U+1F9FF
    // Also check for common symbols that might be emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
    expect(html).not.toMatch(emojiRegex);
  });

  test('snapshot of confirmation email', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));
    expect(html).toMatchSnapshot();
  });

  test('renders correctly with partner', () => {
    const propsWithPartner = {
      ...confirmedProps,
      bringsPartner: true,
    };

    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, propsWithPartner));

    // Should mention partner
    expect(html).toContain('You and your partner are confirmed');
  });

  test('renders correctly without menu', () => {
    const propsNoMenu = {
      ...confirmedProps,
      menu: null,
    };

    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, propsNoMenu));

    // Should not have menu section but otherwise render fine
    expect(html).not.toContain('Three-course');
    expect(html).toContain('The Village Pub');
  });

  test('renders correctly without parking note', () => {
    const propsNoParkingNote = {
      ...confirmedProps,
      parkingNote: null,
    };

    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, propsNoParkingNote));

    expect(html).not.toContain('Valet parking');
    expect(html).toContain('The Village Pub');
  });

  test('all three calendar button links are clickable hrefs', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));

    // Check that the URLs are in href attributes (note: & is escaped to &amp; in HTML)
    expect(html).toContain('href="https://calendar.google.com/calendar/render');
    expect(html).toContain('href="https://outlook.live.com/calendar/0/deeplink/compose');
    expect(html).toContain(`href="${confirmedProps.icsUrl}"`);
  });

  test('cancel URL is present', () => {
    const html = renderToStaticMarkup(React.createElement(ReservationConfirmation, confirmedProps));
    expect(html).toContain(confirmedProps.cancelUrl);
  });
});
