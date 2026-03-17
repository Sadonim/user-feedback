// Ambient module declaration for jest-axe.
// This file must NOT have any top-level imports/exports (script file)
// so that `declare module` acts as an ambient declaration, not augmentation.

declare module 'jest-axe' {
  type AxeResults = import('axe-core').AxeResults;
  type RunOptions = import('axe-core').RunOptions;

  interface JestAxeConfigureOptions {
    rules?: Record<string, { enabled: boolean }>;
    runOnly?: { type: string; values: string[] };
    [key: string]: unknown;
  }

  type AxeTestFunction = (
    html: Element | string,
    options?: RunOptions
  ) => Promise<AxeResults>;

  export function configureAxe(options?: JestAxeConfigureOptions): AxeTestFunction;
  export function axe(html: Element | string, options?: RunOptions): Promise<AxeResults>;
  // Intentionally typed to match what expect.extend() accepts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const toHaveNoViolations: Record<string, (received: any) => { pass: boolean; message(): string }>;
}
