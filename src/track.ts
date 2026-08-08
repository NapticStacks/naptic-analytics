// Structural Plausible global — kept as a local shape so we never import a
// provider SDK.
export type PlausibleProps = Record<string, string | number | boolean>;
type PlausibleFn = (event: string, options?: { props?: PlausibleProps }) => void;

function getPlausible(): PlausibleFn | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { plausible?: PlausibleFn }).plausible;
}

function currentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location?.hostname ?? '';
}

/**
 * Emit a named analytics event, always labelled with the serving hostname.
 *
 * Safe no-op when the provider script has not loaded (or analytics is
 * disabled) — never throws in the browser, never throws under SSR / static
 * export.
 *
 * WHY the hostname rides on EVENTS and not just pageviews: one build commonly
 * serves several hostnames from one CDN distribution, and Plausible groups by
 * PATHNAME — so a storefront's "/" and a landing site's "/" collapse into one
 * dashboard row. <Analytics/> labels PAGEVIEWS via the script tag's `event-*`
 * attribute, but that mechanism does not touch custom events. Labelling
 * pageviews alone produces a segment that separates visits and not
 * conversions, which is the half that does not answer a revenue question.
 *
 * The hostname is derived here, LAST, so a caller cannot override it — an event
 * must not be able to claim it happened somewhere it did not.
 *
 * `event` is a plain string: this package cannot know a consumer's event
 * names. Consumers narrow it in their own wrappers.
 */
export function track(event: string, props?: PlausibleProps): void {
  const plausible = getPlausible();
  if (!plausible) return;
  const host = currentHostname();
  const merged = { ...(props ?? {}), ...(host ? { hostname: host } : {}) };
  plausible(event, Object.keys(merged).length ? { props: merged } : undefined);
}
