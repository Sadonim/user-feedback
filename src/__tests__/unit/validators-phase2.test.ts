/**
 * Unit: Phase 2 Zod 검증 스키마
 *
 * 대상:
 *  - updateTicketSchema   (PATCH /api/v1/tickets/:id 요청 바디)
 *  - ticketFiltersSchema  (GET  /api/v1/tickets 쿼리 파라미터)
 *
 * TDD RED phase — 스키마는 이미 src/lib/validators/feedback.ts에 존재하지만
 * 테스트가 없으므로 커버리지 기준(95%)을 충족하지 못한다.
 */
import { describe, it, expect } from 'vitest';
import { updateTicketSchema, ticketFiltersSchema } from '@/lib/validators/feedback';

// ─────────────────────────────────────────────────────────────────────────────
// updateTicketSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('updateTicketSchema', () => {
  describe('유효한 입력', () => {
    it('status만 제공해도 통과해야 한다', () => {
      const result = updateTicketSchema.safeParse({ status: 'IN_PROGRESS' });
      expect(result.success).toBe(true);
    });

    it('priority만 제공해도 통과해야 한다', () => {
      const result = updateTicketSchema.safeParse({ priority: 'HIGH' });
      expect(result.success).toBe(true);
    });

    it('status + priority + note를 동시에 제공해도 통과해야 한다', () => {
      const result = updateTicketSchema.safeParse({
        status: 'RESOLVED',
        priority: 'LOW',
        note: 'Fixed in v1.2',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note).toBe('Fixed in v1.2');
      }
    });

    it('status + note만 제공해도 통과해야 한다', () => {
      const result = updateTicketSchema.safeParse({
        status: 'CLOSED',
        note: 'Closing due to inactivity',
      });
      expect(result.success).toBe(true);
    });

    it('priority + note만 제공해도 통과해야 한다 (H4 fix)', () => {
      // note가 priority-only 업데이트에도 함께 저장되어야 한다
      const result = updateTicketSchema.safeParse({
        priority: 'CRITICAL',
        note: 'Escalated to critical',
      });
      expect(result.success).toBe(true);
    });

    it('모든 유효한 status 값을 허용해야 한다', () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
      for (const status of statuses) {
        const result = updateTicketSchema.safeParse({ status });
        expect(result.success, `status=${status}이 거부됨`).toBe(true);
      }
    });

    it('모든 유효한 priority 값을 허용해야 한다', () => {
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
      for (const priority of priorities) {
        const result = updateTicketSchema.safeParse({ priority });
        expect(result.success, `priority=${priority}이 거부됨`).toBe(true);
      }
    });

    it('note는 최대 500자까지 허용해야 한다', () => {
      const result = updateTicketSchema.safeParse({
        status: 'OPEN',
        note: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('유효하지 않은 입력', () => {
    it('status도 priority도 없으면 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse({ note: 'just a note' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(
          /At least one field/i,
        );
      }
    });

    it('빈 객체를 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('유효하지 않은 status 값을 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse({ status: 'PENDING' });
      expect(result.success).toBe(false);
    });

    it('유효하지 않은 priority 값을 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse({ priority: 'URGENT' });
      expect(result.success).toBe(false);
    });

    it('note가 500자를 초과하면 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse({
        status: 'OPEN',
        note: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('null 값을 거부해야 한다', () => {
      const result = updateTicketSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ticketFiltersSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('ticketFiltersSchema', () => {
  describe('기본값 적용', () => {
    it('빈 객체를 파싱하면 기본값이 채워져야 한다', () => {
      const result = ticketFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });
  });

  describe('숫자 강제 변환 (coerce)', () => {
    it('문자열 "2"를 page 숫자로 변환해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ page: '2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
      }
    });

    it('문자열 "50"을 limit 숫자로 변환해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe('선택적 필터', () => {
    it('status 필터를 포함할 수 있어야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ status: 'OPEN' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('OPEN');
      }
    });

    it('type 필터를 포함할 수 있어야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ type: 'BUG' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('BUG');
      }
    });

    it('priority 필터를 포함할 수 있어야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ priority: 'CRITICAL' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('CRITICAL');
      }
    });

    it('sort=updatedAt 과 order=asc를 허용해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({
        sort: 'updatedAt',
        order: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('복합 필터를 동시에 적용할 수 있어야 한다', () => {
      const result = ticketFiltersSchema.safeParse({
        status: 'IN_PROGRESS',
        type: 'FEATURE',
        priority: 'HIGH',
        page: '1',
        limit: '10',
        sort: 'updatedAt',
        order: 'asc',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('IN_PROGRESS');
        expect(result.data.type).toBe('FEATURE');
        expect(result.data.priority).toBe('HIGH');
        expect(result.data.limit).toBe(10);
      }
    });
  });

  describe('경계값 검증', () => {
    it('page=1은 유효해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ page: '1' });
      expect(result.success).toBe(true);
    });

    it('page=0은 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('limit=1은 유효해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ limit: '1' });
      expect(result.success).toBe(true);
    });

    it('limit=100은 유효해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ limit: '100' });
      expect(result.success).toBe(true);
    });

    it('limit=101은 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });
  });

  describe('유효하지 않은 입력', () => {
    it('유효하지 않은 status를 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ status: 'PENDING' });
      expect(result.success).toBe(false);
    });

    it('유효하지 않은 type을 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ type: 'COMPLAINT' });
      expect(result.success).toBe(false);
    });

    it('유효하지 않은 sort 필드를 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ sort: 'title' });
      expect(result.success).toBe(false);
    });

    it('유효하지 않은 order를 거부해야 한다', () => {
      const result = ticketFiltersSchema.safeParse({ order: 'random' });
      expect(result.success).toBe(false);
    });
  });
});
