'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Moves focus to `ref.current` when `condition` becomes true.
 * The element must have `tabIndex={-1}` to be programmatically focusable.
 */
export function useFocusOnMount<T extends HTMLElement>(
  ref: RefObject<T | null>,
  condition: boolean
): void {
  useEffect(() => {
    if (condition && ref.current) {
      ref.current.focus();
    }
  }, [condition, ref]);
}

/**
 * Inserts a transient live-region announcement.
 * The element is removed from the DOM after the SR has had time to read it.
 */
export function announceToSR(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', 'true');
  // sr-only styles inlined so this utility is framework-agnostic
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
  }, 1000);
}
