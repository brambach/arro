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
| `/` | `public/index.html` | Landing page: hero with the waitlist form and the heat room card, how it works, the wall, sat together, kind by design, FAQ |
| `/privacy/` | `public/privacy/index.html` | Privacy policy, the same text as `design/app-store/privacy-policy.md`. App Store Connect's Privacy Policy URL |
| `/support/` | `public/support/index.html` | FAQ, help and the contact email. App Store Connect's Support URL |
| `/join/<code>` | `public/join/index.html`, filled in by `worker.js` | For someone who's been sent an invite. Shows the code large, with a Get the app button |
| `/thanks/` | `public/thanks/index.html` | Where a waitlist post without JS lands. The same copy for a new email and one already on the list |
| anything else | `public/404.html` | Not found |

`/privacy`, `/support`, `/thanks` and `/join` without the slash redirect to the slashed
URL (`html_handling: auto-trailing-slash`).

If the policy changes, change `design/app-store/privacy-policy.md` and the
HTML together. Update the "Last updated" date on the day it's deployed.

## The TestFlight link (placeholder)

There's no public TestFlight link yet, so the join page's **Get the app**
button points at `mailto:support@saunafam.com?subject=TestFlight%20invite`,
which at least reaches Bryce. It carries `data-testflight`. When the public
link exists, replace the `href` on that `[data-testflight]` link in
`public/join/index.html` with it, and later with the App Store link. The
home page has no TestFlight link: it asks for an email instead, with a box
to tick for the beta.

## The waitlist form

Each `form.join` on the home page posts to `/api/waitlist`. With JS,
`site.js` sends it with `fetch` and shows the answer in place: the button
dims while it sends, then the success message crossfades in, or an error
appears under the field. A new email, one already on the list and a filled
honeypot all get the same answer, a 200 with `{"status":"joined"}` or a 303
to `/thanks/`, so neither the API nor the page says whether an email was on
the list. The error copy lives once, in the `#join-bad` and `#join-later` lines
in the page. Without JS the form posts normally and the Worker answers with
a 303 to `/thanks/`, `/#join-bad` or `/#join-later` (a relative `Location`),
and CSS shows the matching line with `:target`. The hidden `hp_field_x`
field is the honeypot, named so autofill leaves it alone. A post needs a
`Content-Length` (411 without one) and at most 2048 bytes of body (413),
counted as the body is read, whatever the header says.

## worker.js

Runs first for pages and the API, and never for the asset paths listed in
`assets.run_worker_first` in `wrangler.jsonc`: `art/`, `fonts/`, `og/`,
`licenses/`, `styles.css`, `site.js` and the icons. Cloudflare serves those
straight from the assets store, so they're free and don't count toward the
daily Worker request limit. A new page is covered without any change. A new
asset folder (say `public/plates/`) has to be added to that list as a `!`
pattern, or `node --test site/assets.test.mjs` fails.

For pages and `/join/...`:

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

Because the Worker skips the asset paths, an asset on `www.saunafam.com`
or `arrofamily.com` (say `arrofamily.com/styles.css`) is served as is, not
redirected, and `http://saunafam.com/styles.css` isn't upgraded to https by
the Worker. Every link that matters is a page or `/join/...`, and those
still redirect. Turn on the zone's **Always Use HTTPS** at deploy time so
plain http asset requests are upgraded too.

`node --test site/worker.test.mjs` checks every redirect with a fake request.
That's the only way to see the hostname redirects locally, because
`wrangler dev` rewrites every request to one host.

## Other files

- `public/styles.css`: tokens (the Löyly palette, the type scale, motion),
  layout, the heat room card and the wall. Spacing sticks to 4, 8, 12, 16,
  20, 24, 32, 40, 56, 64, 72 and 88.
- `public/site.js`, in `<head>`: the first load. It marks the page `.js`
  before the first paint, waits for the fonts (or 1.5 s) and a
  painted frame, adds `.lit`, then `.go` 200 ms later. On the join and 404 pages that plays one settle,
  1100 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, transform and opacity only.
  The home hero is in the first paint and never moves. The wall's 12 slats
  land once, 60 ms apart, the first time it's on screen. The closing
  plate's window glow (`glow-breathe`) starts with `.lit`, and
  `heat-breathe` in the heat room with `.go`.
  With reduced motion everything is shown finished, with 240 ms
  crossfades and no loops. It also runs the waitlist forms (see above).
- `public/fonts/fraunces-soft.woff2`: Fraunces, soft cut (SOFT 100, WONK 0),
  weight 400 to 600 and optical size kept variable, Latin subset, 35 KB.
  Preloaded on every page, `font-display: optional` so a late font never
  swaps and shifts the layout (CLS 0). Body text is the system font. Built
  by `scenes/fraunces.sh`. Licence in `public/licenses/Fraunces-OFL.txt`.
- `public/art/`: `wall.svg` (the faint slat wall behind every page),
  `wall-dark.svg`, wood grain and frost for the slats and the timer's arc
  at 14:32. Drawn by `scenes/art.mjs`.
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
node site/scenes/plates.mjs              # public/art/plate-*.png from scenes/plates/*.svg (needs python3 with Pillow)
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
either already has a DNS record, so check the zone first. In the
saunafam.com zone, turn on SSL/TLS, Edge Certificates, **Always Use HTTPS**
(see "worker.js" above). Then:

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
