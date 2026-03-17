/**
 * Shared axe configuration for WCAG 2.1 AA accessibility tests.
 *
 * Rules disabled for jsdom environment:
 *   - color-contrast: jsdom cannot compute real CSS contrast values
 *   - landmark-one-main, page-has-heading-one, region: fragment-level tests
 *     do not have a full page document structure
 */
import { configureAxe } from 'jest-axe';

export const a11yAxeConfig = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'region': { enabled: false },
  },
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
});
