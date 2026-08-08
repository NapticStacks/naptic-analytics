import { readFileSync } from 'node:fs';
// happy-dom installs its own global URL, which cannot resolve a relative
// specifier against a file: base — so the path is resolved via node:url.
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Analytics } from './Analytics';

// next/script renders a plain <script> in tests — enough to assert attributes.
vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => {
    const { children, strategy: _strategy, ...rest } = props as {
      children?: string;
      strategy?: string;
    };
    return (
      <script
        data-testid="np-script"
        {...rest}
        dangerouslySetInnerHTML={children ? { __html: children } : undefined}
      />
    );
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('<Analytics/>', () => {
  it('renders nothing when no domain is configured', () => {
    const { container } = render(<Analytics env={{}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the loader with the configured domain', () => {
    const { container } = render(
      <Analytics env={{ NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com' }} />,
    );
    const loader = container.querySelector('script[data-domain]');
    expect(loader?.getAttribute('data-domain')).toBe('example.com');
    expect(loader?.getAttribute('src')).toContain('pageview-props');
  });

  it('attaches the serving hostname as a pageview prop', () => {
    // happy-dom's default hostname is "localhost"; override with a real one.
    // defineProperty, NOT vi.stubGlobal — window.location is commonly
    // non-configurable via the stub path and the assertion would silently
    // test "localhost" instead of the hostname it names.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hostname: 'shop.example.com' },
    });
    const { container } = render(
      <Analytics env={{ NEXT_PUBLIC_ANALYTICS_DOMAIN: 'brand.example' }} />,
    );
    const loader = container.querySelector('script[data-domain]');
    expect(loader?.getAttribute('event-hostname')).toBe('shop.example.com');
  });

  it('renders the queue bootstrap so clicks before load are buffered', () => {
    const { container } = render(
      <Analytics env={{ NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com' }} />,
    );
    expect(container.innerHTML).toContain('window.plausible=window.plausible||function');
  });

  // Guards the one failure this component can have that NOTHING else catches:
  // it builds, type-checks, renders, and ships with analytics silently off.
  // This is a client component, so bundlers substitute
  // `process.env.NEXT_PUBLIC_*` textually and ship no populated `process.env`
  // object. Defaulting to bare `process.env` would hand every consumer of this
  // package a site that reports nothing. A render test cannot see this — the
  // test runner has a real process.env — so the assertion is on the source.
  it('defaults env from literal member expressions, not bare process.env', () => {
    const src = readFileSync(
      fileURLToPath(import.meta.url).replace(/\.test\.tsx$/, '.tsx'),
      'utf8',
    );
    expect(src).toContain('process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN');
    expect(src).toContain('process.env.NEXT_PUBLIC_ANALYTICS_SRC');
    expect(src).not.toMatch(/env\s*\?\?\s*\(?\s*process\.env/);
  });

  it('does not throw when rendered without a window (static export / SSR)', async () => {
    // Static export renders components at BUILD time, where window is
    // undefined. A careless hostname read crashes `npm run build`.
    const { renderToStaticMarkup } = await import('react-dom/server');
    expect(() =>
      renderToStaticMarkup(<Analytics env={{ NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com' }} />),
    ).not.toThrow();
  });
});
