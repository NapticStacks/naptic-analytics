import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYTICS_SRC, readAnalyticsEnv } from './env';

describe('readAnalyticsEnv', () => {
  it('returns null when no domain is configured (analytics OFF)', () => {
    expect(readAnalyticsEnv({})).toBeNull();
    expect(readAnalyticsEnv({ NEXT_PUBLIC_ANALYTICS_DOMAIN: '' })).toBeNull();
    expect(readAnalyticsEnv({ NEXT_PUBLIC_ANALYTICS_DOMAIN: '   ' })).toBeNull();
  });

  it('defaults the script src to the Plausible pageview-props build', () => {
    const cfg = readAnalyticsEnv({ NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com' });
    expect(cfg).toEqual({ domain: 'example.com', src: DEFAULT_ANALYTICS_SRC });
    // pageview-props is what lets <Analytics/> attach event-* attributes to
    // the loader. Plain tagged-events cannot carry them at all.
    expect(DEFAULT_ANALYTICS_SRC).toContain('pageview-props');
  });

  it('respects an explicit provider src (provider-swappable)', () => {
    const cfg = readAnalyticsEnv({
      NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com',
      NEXT_PUBLIC_ANALYTICS_SRC: 'https://other.example/js/a.js',
    });
    expect(cfg?.src).toBe('https://other.example/js/a.js');
  });

  it('trims surrounding whitespace on both values', () => {
    const cfg = readAnalyticsEnv({
      NEXT_PUBLIC_ANALYTICS_DOMAIN: '  example.com  ',
      NEXT_PUBLIC_ANALYTICS_SRC: '  https://other.example/js/a.js  ',
    });
    expect(cfg).toEqual({ domain: 'example.com', src: 'https://other.example/js/a.js' });
  });
});
