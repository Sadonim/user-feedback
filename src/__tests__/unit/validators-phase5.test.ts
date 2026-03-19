/**
 * Unit: Phase 5 Zod schema additions
 *
 * TDD RED phase — schemas will be added to src/lib/validators/feedback.ts
 *
 * Targets:
 *  - assignTicketSchema   (POST /api/v1/tickets/:id/assign body)
 *  - ticketFiltersSchema  — assigneeId union (cuid | 'unassigned')
 */
import { describe, it, expect } from 'vitest';

// ── dynamic imports (schemas not yet added → RED) ─────────────────────────
const importValidators = () => import('@/lib/validators/feedback');

// ─────────────────────────────────────────────────────────────────────────────
// assignTicketSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('assignTicketSchema', () => {
  // cuid v1 example — starts with 'c', 25 chars total
  const validCuid = 'cjld2cjxh0000qzrmn831i7rn';

  describe('valid inputs', () => {
    it('should accept a valid CUID string (assign)', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: validCuid });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBe(validCuid);
      }
    });

    it('should accept null (unassign)', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBeNull();
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject an arbitrary non-cuid string', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: 'not-a-valid-cuid' });
      expect(result.success).toBe(false);
    });

    it('should reject an empty string', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject undefined (missing field)', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: undefined });
      // Zod nullable() does not allow undefined — it requires the field to be present
      expect(result.success).toBe(false);
    });

    it('should reject a number', async () => {
      const { assignTicketSchema } = await importValidators();
      const result = assignTicketSchema.safeParse({ assigneeId: 42 });
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ticketFiltersSchema — assigneeId field (Phase 5-2 addition)
// ─────────────────────────────────────────────────────────────────────────────
describe('ticketFiltersSchema — assigneeId (Phase 5-2)', () => {
  const validCuid = 'cjld2cjxh0000qzrmn831i7rn';

  describe('valid inputs', () => {
    it('should accept a valid CUID as assigneeId', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({ assigneeId: validCuid });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBe(validCuid);
      }
    });

    it('should accept "unassigned" as the sentinel value', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({ assigneeId: 'unassigned' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBe('unassigned');
      }
    });

    it('should be optional — no assigneeId is valid', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBeUndefined();
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject an arbitrary string that is not a cuid or "unassigned"', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({ assigneeId: 'some-random-value' });
      expect(result.success).toBe(false);
    });

    it('should reject a numeric string', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({ assigneeId: '12345' });
      expect(result.success).toBe(false);
    });

    it('should reject an empty string', async () => {
      const { ticketFiltersSchema } = await importValidators();
      const result = ticketFiltersSchema.safeParse({ assigneeId: '' });
      expect(result.success).toBe(false);
    });
  });
});
