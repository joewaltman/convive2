import { runCronJob } from '@/lib/runCron';
import type { JobSummary } from '@/lib/types';
import { sendSms } from '@/lib/sms/quo';
import {
  createInvitedBooking,
  createLunch,
  findLunchForTableOnDate,
  getBookingContext,
  getLatestLunchForTable,
  getMemberPaidForLunch,
  incrementConsecutiveUnpaid,
  listActiveMembersForTable,
  listLunchesPastDateNeedingProcessing,
  listStandingTables,
  markLunchNonPayProcessed,
  markLunchStatus,
  releaseMember,
} from '@/lib/lunchclub/data';
import { buildInviteSms } from '@/lib/lunchclub/sms-templates';

const UNPAID_RELEASE_THRESHOLD = 3;
const DEFAULT_START_TIME = '12:00:00';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

/**
 * Today as a YYYY-MM-DD string in LA local time.
 */
function todayPTString(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // 'YYYY-MM-DD'
}

function parseYmd(ymd: string): Date {
  // Interpret as a local-date midpoint to avoid TZ drift in arithmetic.
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function ymd(date: Date): string {
  // Format the date's UTC components since parseYmd uses UTC noon.
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Next occurrence of `dow` strictly after `referenceYmd`.
 * `dow`: 0=Sunday..6=Saturday.
 */
function nextOccurrence(referenceYmd: string, dow: number): string {
  const ref = parseYmd(referenceYmd);
  const refDow = ref.getUTCDay();
  let delta = dow - refDow;
  if (delta <= 0) delta += 7;
  const next = new Date(ref.getTime() + delta * 24 * 60 * 60 * 1000);
  return ymd(next);
}

function maxYmd(a: string, b: string): string {
  return a > b ? a : b;
}

interface RunOpts {
  dryRun?: boolean;
  limit?: number;
}

export async function run(opts: RunOpts = {}): Promise<JobSummary> {
  return runCronJob('lunchclub_monthly_loop', async ({ dryRun }) => {
    let lunchesProcessed = 0;
    let unpaidIncrements = 0;
    let membersReleased = 0;
    let newLunchesCreated = 0;
    let invitesSent = 0;
    let smsErrors = 0;

    // PART A: Post-process past confirmed/cancelled lunches.
    const pastLunches = await listLunchesPastDateNeedingProcessing();
    for (const lunch of pastLunches) {
      if (lunch.status === 'confirmed') {
        const members = await listActiveMembersForTable(lunch.standing_table_id);
        for (const m of members) {
          const wasPaid = await getMemberPaidForLunch(lunch.id, m.signup_id);
          if (wasPaid) continue;
          if (dryRun) {
            unpaidIncrements++;
            continue;
          }
          const newCount = await incrementConsecutiveUnpaid(m.id);
          unpaidIncrements++;
          if (newCount >= UNPAID_RELEASE_THRESHOLD) {
            await releaseMember(m.id);
            membersReleased++;
          }
        }
        if (!dryRun) {
          await markLunchStatus(lunch.id, 'completed');
        }
      }
      if (!dryRun) {
        await markLunchNonPayProcessed(lunch.id);
      }
      lunchesProcessed++;
    }

    // PART B: For each active standing table, ensure the next lunch is created.
    const tables = await listStandingTables({ status: 'active' });
    const today = todayPTString();
    for (const table of tables) {
      const latest = await getLatestLunchForTable(table.id);
      const reference = latest ? maxYmd(latest.lunch_date, today) : today;
      const nextDate = nextOccurrence(reference, table.day_of_week);
      const existing = await findLunchForTableOnDate(table.id, nextDate);
      if (existing) continue;

      const members = await listActiveMembersForTable(table.id);
      if (members.length === 0) continue;

      const venue = latest?.venue ?? table.default_venue ?? '';
      const address = latest?.address ?? table.default_address ?? '';
      if (!venue || !address) {
        // Without venue defaults we cannot create the lunch automatically;
        // skip and let the admin manually create.
        continue;
      }
      const priceCents = latest?.price_cents ?? 4500;
      const startTime = latest?.start_time ?? DEFAULT_START_TIME;

      if (dryRun) {
        newLunchesCreated++;
        continue;
      }

      const newLunch = await createLunch({
        standing_table_id: table.id,
        venue,
        address,
        lunch_date: nextDate,
        start_time: startTime,
        price_cents: priceCents,
        total_seats: 6,
        menu: null,
      });
      newLunchesCreated++;

      for (const m of members) {
        const booking = await createInvitedBooking(
          newLunch.id,
          m.signup_id,
          m.id,
          (m.seats === 2 ? 2 : 1) as 1 | 2,
        );
        const ctx = await getBookingContext(booking.id);
        if (!ctx) continue;
        const sms = buildInviteSms(ctx, baseUrl());
        if (!sms.to) continue;
        const sres = await sendSms(sms);
        if (sres.ok) {
          invitesSent++;
        } else {
          smsErrors++;
          console.error('[lunchclub:monthly] invite sms failed', {
            bookingId: booking.id,
            error: sres.error,
          });
        }
      }
    }

    return {
      ok: true,
      lunches_processed: lunchesProcessed,
      unpaid_increments: unpaidIncrements,
      members_released: membersReleased,
      new_lunches_created: newLunchesCreated,
      invites_sent: invitesSent,
      sms_errors: smsErrors,
    };
  }, { dryRun: opts.dryRun });
}
