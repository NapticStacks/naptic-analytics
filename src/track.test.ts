import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { track } from './track';

const HOST = 'shop.example.com';

beforeEach(() => {
  // defineProperty, NOT vi.stubGlobal — window.location is commonly
  // non-configurable via the stub path, and these assertions would silently
  // pass against "localhost" instead of the hostname they name.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, hostname: HOST },
  });
});

afterEach(() => {
  delete (globalThis as { plausible?: unknown }).plausible;
  vi.restoreAllMocks();
});

describe('track', () => {
  it('does not throw when the provider script has not loaded (no window.plausible)', () => {
    expect(() => track('some_event')).not.toThrow();
  });

  it('carries the serving hostname even when no props are given', () => {
    const spy = vi.fn();
    (globalThis as { plausible?: unknown }).plausible = spy;
    track('buy_click');
    expect(spy).toHaveBeenCalledWith('buy_click', { props: { hostname: HOST } });
  });

  it('merges the hostname alongside caller props', () => {
    const spy = vi.fn();
    (globalThis as { plausible?: unknown }).plausible = spy;
    track('buy_click', { route: '/hat' });
    expect(spy).toHaveBeenCalledWith('buy_click', {
      props: { route: '/hat', hostname: HOST },
    });
  });

  // The hostname is derived, not supplied. A caller must not be able to
  // mislabel where an event happened.
  it('the real hostname wins over a caller-supplied one', () => {
    const spy = vi.fn();
    (globalThis as { plausible?: unknown }).plausible = spy;
    track('buy_click', { hostname: 'attacker.example' });
    expect(spy).toHaveBeenCalledWith('buy_click', { props: { hostname: HOST } });
  });

  it('omits the props payload entirely when no hostname is resolvable', () => {
    const spy = vi.fn();
    (globalThis as { plausible?: unknown }).plausible = spy;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hostname: '' },
    });
    track('buy_click');
    expect(spy).toHaveBeenCalledWith('buy_click', undefined);
  });
});
