/**
 * Test: Data integrity constraints
 *
 * Verifies database constraints are enforced:
 * - Every dinner has chapter_id NOT NULL
 * - Every reservation has dinner_id NOT NULL AND chapter_id NOT NULL
 * - Inserting a guest with trailing whitespace in first_name fails CHECK constraint
 * - Inserting a duplicate active waitlist entry fails the unique partial index
 *
 * Guarded by TEST_DATABASE_URL - skipped if not set.
 */

import { Pool } from 'pg';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const runTests = TEST_DATABASE_URL ? describe : describe.skip;

runTests('Data integrity constraints (real DB)', () => {
  let pool: Pool;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL not set');
    }
    pool = new Pool({ connectionString: TEST_DATABASE_URL });

    // Ensure test schema exists (run migrations would normally handle this)
    // For now, we assume the test DB has the schema already
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('dinner table constraints', () => {
    test('every dinner row has chapter_id NOT NULL', async () => {
      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM dinners WHERE chapter_id IS NULL`
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    test('inserting dinner with NULL chapter_id fails', async () => {
      await expect(
        pool.query(`
          INSERT INTO dinners (chapter_id, venue_id, title, starts_at, total_seats, price_cents)
          VALUES (NULL, 1, 'Test', NOW(), 10, 1000)
        `)
      ).rejects.toThrow();
    });
  });

  describe('reservation table constraints', () => {
    test('every reservation row has dinner_id NOT NULL', async () => {
      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM reservations WHERE dinner_id IS NULL`
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    test('every reservation row has chapter_id NOT NULL', async () => {
      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM reservations WHERE chapter_id IS NULL`
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    test('inserting reservation with NULL dinner_id fails', async () => {
      await expect(
        pool.query(`
          INSERT INTO reservations (guest_id, dinner_id, chapter_id, grad_year, seat_count, status, confirm_token, cancel_token, calendar_token)
          VALUES (1, NULL, 1, 2020, 1, 'pending', 'a', 'b', 'c')
        `)
      ).rejects.toThrow();
    });

    test('inserting reservation with NULL chapter_id fails', async () => {
      await expect(
        pool.query(`
          INSERT INTO reservations (guest_id, dinner_id, chapter_id, grad_year, seat_count, status, confirm_token, cancel_token, calendar_token)
          VALUES (1, 1, NULL, 2020, 1, 'pending', 'a', 'b', 'c')
        `)
      ).rejects.toThrow();
    });
  });

  describe('guest table constraints', () => {
    let testGuestId: number | null = null;

    afterEach(async () => {
      // Cleanup test guest if created
      if (testGuestId) {
        await pool.query(`DELETE FROM guests WHERE id = $1`, [testGuestId]);
        testGuestId = null;
      }
    });

    test('inserting guest with trailing whitespace in first_name fails CHECK constraint', async () => {
      await expect(
        pool.query(`
          INSERT INTO guests (email, first_name, last_name)
          VALUES ('test-whitespace@test.com', 'John ', 'Doe')
        `)
      ).rejects.toThrow();
    });

    test('inserting guest with leading whitespace in first_name fails CHECK constraint', async () => {
      await expect(
        pool.query(`
          INSERT INTO guests (email, first_name, last_name)
          VALUES ('test-whitespace2@test.com', ' John', 'Doe')
        `)
      ).rejects.toThrow();
    });

    test('inserting guest with trailing whitespace in last_name fails CHECK constraint', async () => {
      await expect(
        pool.query(`
          INSERT INTO guests (email, first_name, last_name)
          VALUES ('test-whitespace3@test.com', 'John', 'Doe ')
        `)
      ).rejects.toThrow();
    });

    test('inserting guest with proper trimmed names succeeds', async () => {
      const result = await pool.query(`
        INSERT INTO guests (email, first_name, last_name)
        VALUES ('test-proper@test.com', 'John', 'Doe')
        RETURNING id
      `);
      testGuestId = result.rows[0].id;
      expect(testGuestId).toBeDefined();

      // Cleanup
      await pool.query(`DELETE FROM guests WHERE id = $1`, [testGuestId]);
      testGuestId = null;
    });
  });

  describe('waitlist unique partial index', () => {
    let testDinnerId: number | null = null;
    let testChapterId: number | null = null;
    let testGuestId: number | null = null;
    let testVenueId: number | null = null;

    beforeEach(async () => {
      // Create test fixtures
      const chapterResult = await pool.query(`
        INSERT INTO chapters (slug, short_name, school_name, display_name, from_display_name,
          color_primary, color_secondary, color_header_bg, color_header_text, color_accent, font_family)
        VALUES ('test-wl', 'TWL', 'Test School', 'Test Display', 'Test From',
          '#000', '#fff', '#000', '#fff', '#f00', 'Georgia')
        ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id
      `);
      testChapterId = chapterResult.rows[0].id;

      const venueResult = await pool.query(`
        INSERT INTO venues (name, venue_type, capacity_min, capacity_max)
        VALUES ('Test Venue WL', 'restaurant', 4, 20)
        RETURNING id
      `);
      testVenueId = venueResult.rows[0].id;

      const dinnerResult = await pool.query(`
        INSERT INTO dinners (chapter_id, venue_id, title, starts_at, total_seats, price_cents)
        VALUES ($1, $2, 'Test Dinner WL', NOW() + INTERVAL '7 days', 12, 5000)
        RETURNING id
      `, [testChapterId, testVenueId]);
      testDinnerId = dinnerResult.rows[0].id;

      const guestResult = await pool.query(`
        INSERT INTO guests (email, first_name, last_name)
        VALUES ('test-waitlist@test.com', 'Waitlist', 'Test')
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `);
      testGuestId = guestResult.rows[0].id;
    });

    afterEach(async () => {
      // Cleanup in reverse order
      if (testDinnerId) {
        await pool.query(`DELETE FROM waitlist_entries WHERE dinner_id = $1`, [testDinnerId]);
        await pool.query(`DELETE FROM dinners WHERE id = $1`, [testDinnerId]);
      }
      if (testVenueId) {
        await pool.query(`DELETE FROM venues WHERE id = $1`, [testVenueId]);
      }
      if (testChapterId) {
        await pool.query(`DELETE FROM chapters WHERE id = $1`, [testChapterId]);
      }
      if (testGuestId) {
        await pool.query(`DELETE FROM guests WHERE email = 'test-waitlist@test.com'`);
      }
    });

    test('inserting duplicate active waitlist entry fails unique partial index', async () => {
      // First entry should succeed
      await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'pending')
      `, [testDinnerId, testChapterId, testGuestId]);

      // Second entry with same (dinner, guest) and active status should fail
      await expect(
        pool.query(`
          INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
          VALUES ($1, $2, $3, 'pending')
        `, [testDinnerId, testChapterId, testGuestId])
      ).rejects.toThrow();
    });

    test('inserting waitlist entry after prior one is expired succeeds', async () => {
      // First entry
      const first = await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [testDinnerId, testChapterId, testGuestId]);

      // Mark first as expired
      await pool.query(`
        UPDATE waitlist_entries SET status = 'expired' WHERE id = $1
      `, [first.rows[0].id]);

      // Second entry should succeed
      const second = await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [testDinnerId, testChapterId, testGuestId]);

      expect(second.rows[0].id).toBeDefined();
    });

    test('inserting waitlist entry after prior one is cancelled succeeds', async () => {
      // First entry
      const first = await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [testDinnerId, testChapterId, testGuestId]);

      // Mark first as cancelled
      await pool.query(`
        UPDATE waitlist_entries SET status = 'cancelled' WHERE id = $1
      `, [first.rows[0].id]);

      // Second entry should succeed
      const second = await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [testDinnerId, testChapterId, testGuestId]);

      expect(second.rows[0].id).toBeDefined();
    });

    test('duplicate promoted entries also fail unique index', async () => {
      // First entry as promoted
      await pool.query(`
        INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
        VALUES ($1, $2, $3, 'promoted')
      `, [testDinnerId, testChapterId, testGuestId]);

      // Second entry with pending should fail (both are active statuses)
      await expect(
        pool.query(`
          INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id, status)
          VALUES ($1, $2, $3, 'pending')
        `, [testDinnerId, testChapterId, testGuestId])
      ).rejects.toThrow();
    });
  });
});

// When TEST_DATABASE_URL is not set, provide informative skip message
if (!TEST_DATABASE_URL) {
  describe('Data integrity constraints', () => {
    test.skip('requires TEST_DATABASE_URL environment variable', () => {
      // This test is skipped when TEST_DATABASE_URL is not set
    });
  });
}
