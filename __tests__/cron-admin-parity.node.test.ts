/**
 * Test: Cron / admin-endpoint parity for send-reminders
 *
 * Asserts that the cron's `sendRemindersBody` code and the
 * `POST /api/admin/cron/[job]` endpoint produce identical results
 * for the same input fixture.
 */

import { sendRemindersBody } from '@/lib/cron-jobs/send-reminders';

// Mock Resend (via sendEmail)
const mockSendEmail = jest.fn().mockResolvedValue({ id: 'mock-email-id' });
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  chapterFrom: jest.fn(() => 'Test Chapter <dinners@test.com>'),
  replyTo: jest.fn(() => 'reply@test.com'),
  unsubscribeUrl: jest.fn((guestId: number) => `https://test.com/unsubscribe/${guestId}`),
  bulkHeaders: jest.fn(() => ({})),
}));

// Mock the db module
const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  },
}));

// Mock getDinnerWithRelations
jest.mock('@/lib/dinners', () => ({
  getDinnerWithRelations: jest.fn().mockResolvedValue({
    dinner: {
      id: 1,
      chapter_id: 1,
      venue_id: 1,
      title: 'Test Dinner',
      starts_at: new Date('2026-01-15T03:00:00.000Z'), // tomorrow PT
      total_seats: 12,
      price_cents: 5000,
      menu: null,
      description: 'A test dinner',
      parking_note: null,
      status: 'published',
    },
    chapter: {
      id: 1,
      slug: 'test',
      short_name: 'TEST',
      school_name: 'Test University',
      display_name: 'Test Chapter',
      tagline: null,
      from_display_name: 'Test Chapter',
      color_primary: '#000',
      color_secondary: '#fff',
      color_header_bg: '#000',
      color_header_text: '#fff',
      color_accent: '#B85C38',
      font_family: 'Georgia',
      is_active: true,
    },
    venue: {
      id: 1,
      name: 'Test Restaurant',
      venue_type: 'restaurant',
      address: '123 Main St',
      neighborhood: 'Downtown',
      city: 'Los Angeles',
      google_maps_link: null,
      capacity_min: 6,
      capacity_max: 20,
    },
  }),
}));

// Mock calendar functions
jest.mock('@/lib/calendar', () => ({
  generateGoogleCalendarUrl: jest.fn(() => 'https://calendar.google.com/...'),
  generateOutlookUrl: jest.fn(() => 'https://outlook.live.com/...'),
  generateIcsDownloadUrl: jest.fn((token: string) => `https://test.com/api/calendar/${token}.ics`),
}));

// Mock the requireSuperAdmin to no-op
jest.mock('@/lib/auth/admin', () => ({
  requireSuperAdmin: jest.fn().mockResolvedValue({
    id: 1,
    email: 'admin@test.com',
    chapter_id: null,
    is_active: true,
  }),
}));

// Mock runCronJob to pass through to the body function
jest.mock('@/lib/runCron', () => ({
  runCronJob: jest.fn(
    async (
      _name: string,
      body: (opts: { dryRun: boolean }) => Promise<unknown>,
      opts: { dryRun: boolean }
    ) => body(opts)
  ),
}));

// Import the route handler after mocks
import { POST } from '@/app/api/admin/cron/[job]/route';

describe('Cron / Admin endpoint parity for send-reminders', () => {
  // Fixed date for "tomorrow" calculations
  const NOW = new Date('2026-01-14T12:00:00.000Z'); // Noon UTC on Jan 14

  // 3 confirmed guests fixture
  const confirmedGuests = [
    {
      reservation_id: 101,
      guest_id: 1,
      guest_email: 'alice@test.com',
      guest_unsub: null,
      dinner_id: 1,
      calendar_token: 'cal_token_1',
    },
    {
      reservation_id: 102,
      guest_id: 2,
      guest_email: 'bob@test.com',
      guest_unsub: null,
      dinner_id: 1,
      calendar_token: 'cal_token_2',
    },
    {
      reservation_id: 103,
      guest_id: 3,
      guest_email: 'carol@test.com',
      guest_unsub: null,
      dinner_id: 1,
      calendar_token: 'cal_token_3',
    },
  ];

  const attendeesForReminder = [
    { guest_id: 1, first_name: 'Alice', last_name: 'Smith', grad_year: 2020, major: 'CS', what_do_you_do: 'Engineer' },
    { guest_id: 2, first_name: 'Bob', last_name: 'Jones', grad_year: 2019, major: 'Math', what_do_you_do: 'Data scientist' },
    { guest_id: 3, first_name: 'Carol', last_name: 'White', grad_year: 2021, major: null, what_do_you_do: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    // Setup mockQuery behavior
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM reservations r') && sql.includes('JOIN dinners d')) {
        // Candidate query
        return Promise.resolve(confirmedGuests);
      }
      if (sql.includes('FROM reservations r') && sql.includes('JOIN guests g') && sql.includes('r.status = \'confirmed\'')) {
        // Attendees query
        return Promise.resolve(attendeesForReminder);
      }
      if (sql.includes('UPDATE reservations SET reminder_sent_at')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('cron sendRemindersBody and admin endpoint produce identical summaries', async () => {
    // Run the cron body directly
    const cronSummary = await sendRemindersBody({ dryRun: false, dinnerId: 1 });

    // Capture sendEmail calls from cron
    const cronEmailCalls = mockSendEmail.mock.calls.slice();
    mockSendEmail.mockClear();

    // Reset query mock call count to compare fresh
    mockQuery.mockClear();

    // Now run through the admin endpoint
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ dryRun: false, dinnerId: 1 }),
    } as unknown as Request;

    const response = await POST(mockRequest, { params: Promise.resolve({ job: 'send-reminders' }) });
    const adminResult = await response.json();

    // Capture sendEmail calls from admin endpoint
    const adminEmailCalls = mockSendEmail.mock.calls.slice();

    // Assert identical summaries
    expect(adminResult.summary).toEqual(cronSummary);

    // Assert identical email send argument lists
    expect(adminEmailCalls.length).toBe(cronEmailCalls.length);
    expect(adminEmailCalls.length).toBe(3); // 3 confirmed guests

    // Compare each email call (excluding react component reference equality)
    for (let i = 0; i < cronEmailCalls.length; i++) {
      const cronCall = cronEmailCalls[i][0];
      const adminCall = adminEmailCalls[i][0];

      expect(adminCall.from).toBe(cronCall.from);
      expect(adminCall.to).toBe(cronCall.to);
      expect(adminCall.subject).toBe(cronCall.subject);
      expect(adminCall.replyTo).toBe(cronCall.replyTo);
    }
  });

  test('both paths process the correct number of emails', async () => {
    const summary = await sendRemindersBody({ dryRun: false, dinnerId: 1 });

    expect(summary.processed).toBe(3);
    expect(summary.sent).toBe(3);
    expect(summary.skipped_unsub).toBe(0);
    expect(summary.errors).toBe(0);
  });

  test('dry run mode skips actual email sends', async () => {
    const summary = await sendRemindersBody({ dryRun: true, dinnerId: 1 });

    expect(summary.sent).toBe(3);
    // In dry run, sendEmail should NOT be called
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
