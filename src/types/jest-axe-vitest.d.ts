// Module file (export {} makes this a module) to augment Vitest's Assertion
// interface so .toHaveNoViolations() is type-safe in a11y tests.
export {};

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<R = any> {
    toHaveNoViolations(): R;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
