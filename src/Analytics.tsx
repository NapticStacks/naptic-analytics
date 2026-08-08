'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { readAnalyticsEnv, type EnvLike } from './env';

export interface AnalyticsProps {
  /**
   * Defaults to the NEXT_PUBLIC_* build-time values so consumers can mount
   * <Analytics/> with no props. Injectable for tests.
   */
  env?: EnvLike;
}

/**
 * Read the build-time analytics env.
 *
 * Each var is spelled out as a LITERAL `process.env.NEXT_PUBLIC_*` member
 * expression, and that is load-bearing. <Analytics/> is a client component (it
 * must be, to read window.location), so bundlers substitute these expressions
 * TEXTUALLY at build time and ship no populated `process.env` object to the
 * browser. Passing bare `process.env` instead compiles, type-checks, builds,
 * and then silently resolves to no domain at runtime: no script, no events, no
 * error. Consumers must transpile this package (Next: `transpilePackages`),
 * which is what puts this source through their bundler's substitution pass.
 */
function defaultEnv(): EnvLike {
  return {
    NEXT_PUBLIC_ANALYTICS_DOMAIN: process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN,
    NEXT_PUBLIC_ANALYTICS_SRC: process.env.NEXT_PUBLIC_ANALYTICS_SRC,
  };
}

/**
 * Cookieless analytics provider script, mounted sitewide from the root layout.
 *
 * Renders nothing when no domain is configured — a build without the env is a
 * clean no-op (no script, no consent banner, every track() call inert).
 *
 * WHY the hostname prop: one build commonly serves several hostnames from a
 * single CDN distribution, and Plausible groups by PATHNAME — so a storefront's
 * "/" and a landing site's "/" collapse into one dashboard row. Reporting the
 * serving hostname as a pageview custom property is what makes those surfaces
 * separable inside a single brand property.
 */
export function Analytics({ env }: AnalyticsProps = {}) {
  const config = readAnalyticsEnv(env ?? defaultEnv());

  // Client-only. Static export renders this component at BUILD time, where
  // `window` is undefined — reading location during render crashes the build.
  // It would also risk a hydration mismatch, since server and client would
  // produce different children.
  const [hostname, setHostname] = useState<string | null>(null);
  useEffect(() => {
    setHostname(window.location?.hostname ?? '');
  }, []);

  if (!config) return null;

  return (
    <>
      {/*
        Plausible does not create window.plausible until the script finishes
        loading, so a click before then would hit track()'s no-op path and be
        dropped. This is Plausible's documented queue bootstrap: it defines
        window.plausible immediately as a queue, and the real script flushes it
        on load. Idempotent (`|| function`), so load order does not matter.

        Rendered UNCONDITIONALLY of `hostname` — it is what buffers the events
        that occur while we wait for the loader below.
      */}
      <Script id="plausible-queue" strategy="afterInteractive">
        {'window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}'}
      </Script>
      {/*
        Withheld until the hostname is known. Plausible reads `event-*`
        attributes WHEN THE SCRIPT LOADS, so adding the attribute in a later
        re-render would attach nothing. The queue above covers the gap.

        KNOWN BIAS: this defers the loader one cycle past afterInteractive, so
        the fastest bounces go uncounted and conversion RATES read high in
        absolute terms. The bias is identical pre and post on the same hostname,
        so a pre/post comparison on one hostname holds — but cross-hostname rate
        comparisons are not valid.
      */}
      {hostname !== null && (
        <Script
          defer
          data-domain={config.domain}
          src={config.src}
          event-hostname={hostname}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
