# saunafam.com

Saunafam's website. Plain HTML, CSS and a little JS, served by a Cloudflare
Worker with static assets. No framework, no build step and no npm packages.
It isn't part of the Expo app, and it stays out of the app's `public/`
folder, which Expo web serves.

The look is Direction A, Löyly (birch, stone and ember), from
`design/saunafam-spec.md` section 2. The copy is from section 5.

## Pages

| URL | File | What it is |
| --- | --- | --- |
| `/` | `public/index.html` | Landing page: hero with the heat room phone, how it works, the wall, sat together, kind by design, sauna types, FAQ |
| `/privacy/` | `public/privacy/index.html` | Privacy policy, the same text as `design/app-store/privacy-policy.md`. App Store Connect's Privacy Policy URL |
| `/support/` | `public/support/index.html` | FAQ, help and the contact email. App Store Connect's Support URL |
| `/join/<code>` | `public/join/index.html`, filled in by `worker.js` | For someone who's been sent an invite. Shows the code large, with a Get the app button |
| anything else | `public/404.html` | Not found |

`/privacy`, `/support` and `/join` without the slash redirect to the slashed
URL (`html_handling: auto-trailing-slash`).

If the policy changes, change `design/app-store/privacy-policy.md` and the
HTML together. Update the "Last updated" date on the day it's deployed.

## The TestFlight link (placeholder)

There's no public TestFlight link yet, so every **Join the TestFlight** and
**Get the app** button points at
`mailto:support@saunafam.com?subject=TestFlight%20invite`, which at least
reaches Bryce. Each of those links carries `data-testflight`. When the
public link exists, replace the `href` on every `[data-testflight]` link
(in `public/index.html` twice and `public/join/index.html` once) with it,
and later with the App Store link.

## worker.js

Runs before the files (`assets.run_worker_first`):

- `arrofamily.com` and `www.arrofamily.com`, any path: 301 to
  `https://saunafam.com` with the same path and query. That keeps build 8
  invite links, the old App Store privacy URL and bookmarks working. Keep it
  until at least October 2027.
- `www.saunafam.com` and plain `http://`: 301 to the https apex.
- `/join/<code>` (4 to 12 letters and numbers): serves the join page with
  the code written into the page, the `<title>`, `og:title`,
  `twitter:title` and `og:url` (HTMLRewriter), so link previews in
  iMessage show the code without running JS. `/join/<code>/` and the old
  `/join/?code=<code>` redirect to it.

`node --test site/worker.test.mjs` checks every redirect with a fake request.
That's the only way to see the hostname redirects locally, because
`wrangler dev` rewrites every request to one host.

## Other files

- `public/styles.css`: tokens (the Löyly palette, the type scale, motion),
  layout, the phone and the wall. Spacing sticks to 4, 8, 12, 16, 20, 24,
  32, 40, 56 and 72.
- `public/site.js`, in `<head>`: the first load. It marks the page `.js`
  before the first paint (so the settle starts from a still frame), waits
  for the fonts and a painted frame, holds 200 ms, then adds `.go`: one
  settle, 1100 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, transform and opacity
  only. The headline is part of the still frame and never moves. The wall's
  12 slats land once, 50 ms apart, the first time it's on screen. Ambient
  loops (`glow-breathe` on the phone, `steam-drift` on the haze) start after
  the settle. With reduced motion everything is shown finished, with 240 ms
  crossfades and no loops.
- `public/fonts/fraunces-soft.woff2`: Fraunces, soft cut (SOFT 100, WONK 0),
  weight 400 to 600 and optical size kept variable, Latin subset, 35 KB.
  Preloaded on every page, `font-display: optional` so a late font never
  swaps and shifts the layout (CLS 0). Body text is the system font. Built
  by `scenes/fraunces.sh`. Licence in `public/licenses/Fraunces-OFL.txt`.
- `public/art/`: `wall.svg` (the faint slat wall behind every page),
  `wall-dark.svg`, wood grain and frost for the slats and the timer's arc
  at 14:32. Drawn by `scenes/art.mjs`. `icons.svg` is a sprite of the
  sauna type marks (24 grid, 1.8 stroke), drawn by hand.
- `public/og/home.png` and `og/join.png`: the 1200 x 630 social cards, used
  for `og:image` and `twitter:image` (`summary_large_image`). Rendered by
  `scenes/render-og.mjs` from `scenes/og/*.html`.
- `public/favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180) and
  `icon-512.png`: **temporary** stone marks. The icon pipeline
  (`scripts/generate-icons.mjs`) overwrites them with the same names.
- The wordmark in the header and footer is the single element
  `<a class="wordmark">saunafam</a>` set in Fraunces. To use
  `assets/brand/wordmark.svg`, put an `<img alt="Saunafam">` inside that
  link (or swap the link's content) and size it in `.wordmark`.
- `public/_headers`: security headers, including a content security policy
  that only allows the site's own files. Inline `style=""` and `<script>`
  won't run, so keep styles in `styles.css` and scripts in their own files.
- `wrangler.jsonc`: the Worker, named `saunafam`, with `public/` as its
  assets and four custom domains (`saunafam.com`, `www.saunafam.com`,
  `arrofamily.com`, `www.arrofamily.com`). Only `public/` is uploaded.

## Scripts in scenes/ (not served)

Playwright isn't in the app's `package.json`. Install it outside the repo
and point `NODE_PATH` at it:

```sh
npm i --prefix /tmp/pw playwright && /tmp/pw/node_modules/.bin/playwright install chromium
export NODE_PATH=/tmp/pw/node_modules
node site/scenes/art.mjs                 # public/art/*.svg
node site/scenes/render-og.mjs --icons   # og/*.png, and the temporary icons
node site/scenes/capture.mjs all         # screenshots and the first-load recording (needs wrangler dev and ffmpeg)
node site/scenes/link-preview.mjs        # design/screenshots/saunafam/invite-link-preview.png (needs wrangler dev)
```

## Preview

```sh
cd site
npx wrangler dev --local-upstream localhost:8787
```

Open http://localhost:8787. Without `--local-upstream`, wrangler dev
rewrites every request to `http://saunafam.com`, and the worker's http to
https redirect loops. Lighthouse runs against the same server:

```sh
npx lighthouse http://localhost:8787/ --form-factor=mobile --output=json --output-path=design/lighthouse/home.json --chrome-flags="--headless=new"
```

## Deploy (Bryce's step only)

Nobody but Bryce deploys, and only on his go. From this folder, signed in
to the Cloudflare account that holds saunafam.com and arrofamily.com
(`npx wrangler whoami`):

```sh
cd site
npx wrangler deploy
```

This is a new Worker name (`saunafam`), and the old `arrofamily` Worker
still holds the arrofamily.com custom domains. If the deploy says those
hostnames are in use, remove them from the old Worker in the dashboard (or
`npx wrangler delete --name arrofamily`) and deploy again. I haven't tried
this against the live account. The first deploy creates DNS records and certificates for
`saunafam.com` and `www.saunafam.com` (`custom_domain: true`); it fails if
either already has a DNS record, so check the zone first. Then:

```sh
for p in / /privacy/ /support/ /join/ABC23456; do curl -s -o /dev/null -w "%{http_code} $p\n" https://saunafam.com$p; done
curl -sI https://arrofamily.com/privacy/ | grep -i -E "^HTTP|^location"
curl -sI https://www.saunafam.com/support/ | grep -i -E "^HTTP|^location"
```

Expect 200s, and 301s to `https://saunafam.com/privacy/` and
`https://saunafam.com/support/`.

## Email

The pages give `support@saunafam.com`. Forward it to a real inbox with
Cloudflare Email Routing (free). Until that's set up, mail to it bounces.
