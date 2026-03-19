// @vitest-environment jsdom
/**
 * Unit: useTicketStream hook
 *
 * src/hooks/useTicketStream.ts already exists — these tests verify its contract.
 *
 * Spec (design_phase5.md §3.8):
 *   - Creates EventSource on mount (if enabled !== false)
 *   - Sets connected=true on 'open', false on 'error'
 *   - Fires onInit callback when 'init' event is received
 *   - Fires onCreated / onUpdated callbacks on respective events
 *   - Cleans up EventSource on unmount
 *
 * Strategy: class-based EventSource mock that captures addEventListener calls.
 * Arrow functions cannot be used as constructors, so we use a class.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SSEInitPayload, TicketStreamItem } from '@/types';

// ── EventSource class mock ─────────────────────────────────────────────────
type EventHandler = (event: MessageEvent) => void;

interface MockESInstance {
  url: string;
  listeners: Record<string, EventHandler[]>;
  close: ReturnType<typeof vi.fn>;
  /** Simulate receiving an SSE event */
  _trigger(type: string, data?: unknown): void;
}

let mockInstance: MockESInstance;

class MockEventSource {
  private _listeners: Record<string, EventHandler[]> = {};
  close = vi.fn();
  url: string;

  constructor(url: string) {
    this.url = url;
    // Expose as module-level reference for test helpers
    mockInstance = {
      url,
      listeners: this._listeners,
      close: this.close,
      _trigger: (type: string, data?: unknown) => {
        const msg = new MessageEvent(type, {
          data: data !== undefined ? JSON.stringify(data) : '',
        });
        (this._listeners[type] ?? []).forEach((h) => h(msg));
      },
    };
  }

  addEventListener(type: string, handler: EventHandler) {
    this._listeners[type] = this._listeners[type] ?? [];
    this._listeners[type].push(handler);
  }

  removeEventListener(type: string, handler: EventHandler) {
    this._listeners[type] = (this._listeners[type] ?? []).filter((h) => h !== handler);
  }
}

// Replace global EventSource before importing the hook
vi.stubGlobal('EventSource', MockEventSource);

// Mock sonner to avoid ESM import errors in jsdom environment
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

// ── hook under test ────────────────────────────────────────────────────────
const importHook = () => import('@/hooks/useTicketStream').then((m) => m.useTicketStream);

// ─────────────────────────────────────────────────────────────────────────────
describe('useTicketStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an EventSource pointing to /api/v1/tickets/stream on mount', async () => {
    const useTicketStream = await importHook();
    renderHook(() => useTicketStream());
    expect(mockInstance.url).toBe('/api/v1/tickets/stream');
  });

  it('does NOT create EventSource when enabled=false', async () => {
    const useTicketStream = await importHook();
    // If enabled=false, no EventSource is created — mockInstance remains undefined
    const prevInstance = mockInstance;
    renderHook(() => useTicketStream({ enabled: false }));
    // mockInstance should not have been re-set
    expect(mockInstance).toBe(prevInstance);
  });

  it('sets connected=true when "open" event is dispatched', async () => {
    const useTicketStream = await importHook();
    const { result } = renderHook(() => useTicketStream());
    expect(result.current.connected).toBe(false);
    act(() => {
      mockInstance._trigger('open');
    });
    expect(result.current.connected).toBe(true);
  });

  it('sets connected=false when "error" event is dispatched', async () => {
    const useTicketStream = await importHook();
    const { result } = renderHook(() => useTicketStream());
    // First connect
    act(() => { mockInstance._trigger('open'); });
    expect(result.current.connected).toBe(true);
    // Then error
    act(() => { mockInstance._trigger('error'); });
    expect(result.current.connected).toBe(false);
  });

  it('calls onInit callback when init event is received', async () => {
    const useTicketStream = await importHook();
    const onInit = vi.fn();
    const initPayload: SSEInitPayload = { total: 42, open: 7 };
    renderHook(() => useTicketStream({ onInit }));
    act(() => {
      mockInstance._trigger('init', initPayload);
    });
    expect(onInit).toHaveBeenCalledWith(initPayload);
  });

  it('calls onCreated callback when ticket.created event is received', async () => {
    const useTicketStream = await importHook();
    const onCreated = vi.fn();
    const item: Partial<TicketStreamItem> = {
      id: 'ticket-1',
      status: 'OPEN',
      type: 'BUG',
    };
    renderHook(() => useTicketStream({ onCreated }));
    act(() => {
      mockInstance._trigger('ticket.created', item);
    });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
  });

  it('calls onUpdated callback when ticket.updated event is received', async () => {
    const useTicketStream = await importHook();
    const onUpdated = vi.fn();
    const item: Partial<TicketStreamItem> = {
      id: 'ticket-2',
      status: 'RESOLVED',
      type: 'FEATURE',
    };
    renderHook(() => useTicketStream({ onUpdated }));
    act(() => {
      mockInstance._trigger('ticket.updated', item);
    });
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-2' }));
  });

  it('closes EventSource on unmount', async () => {
    const useTicketStream = await importHook();
    const { unmount } = renderHook(() => useTicketStream());
    const closeSpy = mockInstance.close;
    unmount();
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
