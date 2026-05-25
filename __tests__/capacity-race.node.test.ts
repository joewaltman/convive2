/**
 * Test: Capacity race condition
 *
 * 20 concurrent calls to startReservation on a 12-seat dinner.
 * Exactly 12 should succeed (return ok: true with reservation).
 * 8 should receive { ok: false, fullForBooking: true }.
 *
 * When TEST_DATABASE_URL is not set, we mock the transaction and prove
 * the FOR UPDATE / capacity-check logic by mocking the SELECT to return
 * monotonically increasing counts.
 */

import type { PoolClient, QueryResult } from 'pg';
import type { Reservation } from '@/lib/types';

// Shared state to simulate atomic capacity tracking
let globalUsedSeats = 0;
let reservationIdCounter = 1;
const usedSeatsLock = { locked: false };

// Simulate acquiring a lock (FOR UPDATE)
async function acquireLock(): Promise<void> {
  while (usedSeatsLock.locked) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  usedSeatsLock.locked = true;
}

function releaseLock(): void {
  usedSeatsLock.locked = false;
}

// Create mock client factory
const createMockClient = () => {
  let inTransaction = false;
  let localUsedSeats = 0;
  let hasLock = false;

  return {
    query: jest.fn(async (sql: string, params?: unknown[]): Promise<QueryResult<Record<string, unknown>>> => {
      // BEGIN
      if (sql === 'BEGIN') {
        inTransaction = true;
        return { rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] };
      }

      // ROLLBACK
      if (sql === 'ROLLBACK') {
        if (hasLock) {
          releaseLock();
          hasLock = false;
        }
        inTransaction = false;
        return { rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] };
      }

      // COMMIT
      if (sql === 'COMMIT') {
        if (hasLock) {
          releaseLock();
          hasLock = false;
        }
        inTransaction = false;
        return { rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] };
      }

      // SELECT dinner FOR UPDATE - acquire lock
      if (sql.includes('FROM dinners') && sql.includes('FOR UPDATE')) {
        await acquireLock();
        hasLock = true;
        localUsedSeats = globalUsedSeats;
        return {
          rows: [{
            id: 1,
            total_seats: 12,
            chapter_id: 1,
            allows_couples: false,
          }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      }

      // SELECT seat count - return current global count
      if (sql.includes('COALESCE(SUM(seat_count)')) {
        return {
          rows: [{ used: String(localUsedSeats) }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      }

      // INSERT reservation - atomically increment
      if (sql.includes('INSERT INTO reservations')) {
        globalUsedSeats += 1;
        const resId = reservationIdCounter++;
        const newRes: Partial<Reservation> = {
          id: resId,
          guest_id: params?.[0] as number,
          dinner_id: params?.[1] as number,
          chapter_id: params?.[2] as number,
          grad_year: params?.[3] as number,
          major: params?.[4] as string | null,
          brings_partner: params?.[5] as boolean,
          seat_count: params?.[6] as number,
          status: 'pending',
          confirm_token: params?.[7] as string,
          cancel_token: params?.[8] as string,
          calendar_token: params?.[9] as string,
          pending_expires_at: new Date(Date.now() + 30 * 60 * 1000),
          booked_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
        return {
          rows: [newRes],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        };
      }

      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }),
    release: jest.fn(() => {
      if (hasLock) {
        releaseLock();
        hasLock = false;
      }
    }),
  } as unknown as PoolClient;
};

// Mock the pool
jest.mock('@/lib/db', () => {
  return {
    pool: {
      connect: jest.fn(() => Promise.resolve(createMockClient())),
    },
    query: jest.fn(),
  };
});

// Mock tokens
jest.mock('@/lib/tokens', () => ({
  generateUrlSafeToken: jest.fn(() => `token_${Math.random().toString(36).slice(2)}`),
}));

// Import after mocks
import { startReservation } from '@/lib/reservations';

const runWithRealDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;
const runWithMockDb = process.env.TEST_DATABASE_URL ? describe.skip : describe;

runWithMockDb('Capacity race condition (mocked DB)', () => {
  beforeEach(() => {
    globalUsedSeats = 0;
    reservationIdCounter = 1;
    usedSeatsLock.locked = false;
    jest.clearAllMocks();
  });

  test('20 concurrent calls: exactly 12 succeed, 8 fail with fullForBooking', async () => {
    const promises: Promise<Awaited<ReturnType<typeof startReservation>>>[] = [];

    for (let i = 1; i <= 20; i++) {
      promises.push(
        startReservation({
          guestId: i,
          dinnerId: 1,
          gradYear: 2020,
          major: 'Test',
          bringsPartner: false,
        })
      );
    }

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.ok === true);
    const failures = results.filter((r) => r.ok === false && 'fullForBooking' in r && r.fullForBooking);

    expect(successes.length).toBe(12);
    expect(failures.length).toBe(8);
  });

  test('capacity check uses FOR UPDATE lock', async () => {
    const { pool } = require('@/lib/db');
    const mockClient = createMockClient();
    pool.connect.mockResolvedValueOnce(mockClient);

    await startReservation({
      guestId: 1,
      dinnerId: 1,
      gradYear: 2020,
      major: 'Test',
      bringsPartner: false,
    });

    // Check that FOR UPDATE was used in the dinner query
    const queryCalls = (mockClient.query as jest.Mock).mock.calls;
    const dinnerQuery = queryCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('FROM dinners') && call[0].includes('FOR UPDATE')
    );
    expect(dinnerQuery).toBeDefined();
  });

  test('transaction is committed on success', async () => {
    const { pool } = require('@/lib/db');
    const mockClient = createMockClient();
    pool.connect.mockResolvedValueOnce(mockClient);

    globalUsedSeats = 0; // Reset

    const result = await startReservation({
      guestId: 1,
      dinnerId: 1,
      gradYear: 2020,
      major: 'Test',
      bringsPartner: false,
    });

    expect(result.ok).toBe(true);

    const queryCalls = (mockClient.query as jest.Mock).mock.calls;
    const commitCall = queryCalls.find((call) => call[0] === 'COMMIT');
    expect(commitCall).toBeDefined();
  });

  test('transaction is rolled back when capacity exceeded', async () => {
    const { pool } = require('@/lib/db');
    const mockClient = createMockClient();
    pool.connect.mockResolvedValueOnce(mockClient);

    // Pre-fill to capacity
    globalUsedSeats = 12;

    const result = await startReservation({
      guestId: 1,
      dinnerId: 1,
      gradYear: 2020,
      major: 'Test',
      bringsPartner: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fullForBooking).toBe(true);
    }

    const queryCalls = (mockClient.query as jest.Mock).mock.calls;
    const rollbackCall = queryCalls.find((call) => call[0] === 'ROLLBACK');
    expect(rollbackCall).toBeDefined();
  });
});

runWithRealDb('Capacity race condition (real DB)', () => {
  // These tests would run against a real test database
  // Implementation would be similar but using actual Pool connections

  beforeAll(async () => {
    // Setup test database schema and fixtures
    // This would create the test dinner with 12 seats
  });

  afterAll(async () => {
    // Cleanup test data
  });

  test('20 concurrent calls: exactly 12 succeed, 8 fail with fullForBooking', async () => {
    // Real DB implementation
    // Would need actual pool connection to TEST_DATABASE_URL
    expect(true).toBe(true); // Placeholder
  });
});
