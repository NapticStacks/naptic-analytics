# @naptic/analytics

Cookieless analytics mechanism (Plausible-compatible) shared across Naptic
client sites. **This package owns HOW attribution works. Consumers own WHAT
they measure** — event names and `track*` wrappers belong in the site repo.

No cookies, so no consent banner. Every entry point is a safe no-op until a
domain is configured and the provider script has loaded.

## Install

Pin an exact tag, never a branch — a push to `main` must never change what a
site deploys.

```json
{ "dependencies": { "@naptic/analytics": "github:NapticStacks/naptic-analytics#v1.0.0" } }
```

Commit the lockfile: tags are movable, and `npm ci` resolving a pinned commit
SHA is what makes a deploy reproducible.

Next.js consumers **must** transpile it (the package ships source, no build
step):

```js
// next.config.js
transpilePackages: ['@naptic/analytics'],
```

This is not optional styling — it is what puts this package's source through
your bundler's `process.env.NEXT_PUBLIC_*` substitution pass. Without it, the
component resolves no domain and silently reports nothing.

## Use

```tsx
// app/layout.tsx
import { Analytics } from '@naptic/analytics';
// ... render <Analytics /> inside <body>

// your own site-specific wrapper
import { track } from '@naptic/analytics';
```

Set `NEXT_PUBLIC_ANALYTICS_DOMAIN` to the Plausible property. Unset means OFF:
no script, no consent banner, every `track()` inert.

## The hostname prop

One build often serves several hostnames from a single CDN distribution, and
Plausible groups by **pathname** — so `shop.example.com/` and
`www.example.com/` collapse into one row. This package reports
`window.location.hostname` on **both** halves of the picture:

- **Pageviews** — `<Analytics/>` puts `event-hostname` on the script tag, which
  the `pageview-props` build reads at load time. That build is the default
  `src`; plain `tagged-events` cannot carry `event-*` at all.
- **Custom events** — `track()` merges the hostname into every event's props.
  The script-tag mechanism does *not* touch custom events, so labelling
  pageviews alone gives you a segment that separates visits and not
  conversions.

The hostname is derived, never accepted from the caller: an event must not be
able to claim it happened somewhere it did not.

### Known bias

`<Analytics/>` withholds the loader until the hostname is known on the client,
because Plausible reads `event-*` attributes **when the script loads** — adding
the attribute in a later re-render would attach nothing. A queue bootstrap
renders immediately so clicks in that window are buffered rather than dropped.

The cost is one deferred cycle past `afterInteractive`: the fastest bounces go
uncounted, so conversion **rates** read high in absolute terms. The bias is
identical pre and post on the same hostname, so a pre/post comparison on one
hostname holds. **Do not compare rates across hostnames** — bounce profiles
differ and the bias does not cancel.

## Verifying a deploy

`next/script` injects the tag **client-side** and this is a client component,
so there is no `<script data-domain=...>` in the served HTML and there never
will be. Grepping the HTML reads as broken while everything works.

Assert against the emitted bundle instead, and make it a deploy gate:

```bash
grep -rqF "$NEXT_PUBLIC_ANALYTICS_DOMAIN" out/_next/static/chunks/ \
  || { echo "analytics would deploy OFF"; exit 1; }
```

The load-bearing check is a real browser: open the site, and confirm the POST
to `plausible.io/api/event` carries `"p":{"hostname":"<the serving host>"}`.
A pageview row with no conversions beneath it means `track()` is not carrying
the prop.

## Development

```bash
npm install
npm test        # vitest
npm run typecheck
```
