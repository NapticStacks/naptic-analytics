/**
 * Cookieless, privacy-friendly analytics (Plausible-compatible) — the MECHANISM.
 *
 * This package owns HOW attribution works. Consumers own WHAT they measure:
 * their own event names and track* wrappers live in their own repos.
 *
 * No cookies, so no consent banner. Every entry point is a safe no-op until a
 * domain is configured and the provider script has loaded.
 */

/**
 * Plausible's tagged-events + pageview-props build. tagged-events exposes the
 * window.plausible(event, { props }) custom-event API; pageview-props reads
 * `event-*` attributes off the script tag and attaches them to every pageview,
 * which is how <Analytics/> reports the serving hostname.
 *
 * Overridable via NEXT_PUBLIC_ANALYTICS_SRC so a different cookieless provider
 * can be swapped in without a code change.
 */
export const DEFAULT_ANALYTICS_SRC =
  'https://plausible.io/js/script.tagged-events.pageview-props.js';

export interface AnalyticsConfig {
  domain: string;
  src: string;
}

export type EnvLike = {
  NEXT_PUBLIC_ANALYTICS_DOMAIN?: string;
  NEXT_PUBLIC_ANALYTICS_SRC?: string;
  // Index signature so Node's process.env (ProcessEnv) is assignable directly.
  [key: string]: string | undefined;
};

/**
 * Resolve analytics config from env. Returns null when no domain is configured
 * — the site then renders no provider script and every track() call is a silent
 * no-op.
 */
export function readAnalyticsEnv(env: EnvLike): AnalyticsConfig | null {
  const domain = (env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? '').trim();
  if (!domain) return null;
  const src = (env.NEXT_PUBLIC_ANALYTICS_SRC ?? '').trim() || DEFAULT_ANALYTICS_SRC;
  return { domain, src };
}
