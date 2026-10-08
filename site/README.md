# arrofamily.com

Arro's website. Plain HTML, CSS and a little JS, served by a Cloudflare Worker
with static assets. No framework, no build step and no npm packages. It isn't
part of the Expo app, and it stays out of the app's `public/` folder, which
Expo web serves.

## Pages

| URL | File | What it is |
| --- | --- | --- |
| `/` | `public/index.html` | Landing page. Copy comes from `design/app-store/listing.md` so the site and the App Store say the same thing. No download button until Arro is on the App Store |
| `/privacy/` | `public/privacy/index.html` | Privacy policy, from `design/app-store/privacy-policy.md`. App Store Connect's Privacy Policy URL |
| `/support/` | `public/support/index.html` | Support page, from `design/app-store/support.md`. App Store Connect's Support URL |
| `/join/` and `/join/<code>` | `public/join/index.html` | For someone who's been sent an invite. With a code in the link (phase 5's `inviteLink()` in `src/state/invite.ts`), it shows the code |
| anything else | `public/404.html` | Not found |

`/privacy`, `/support` and `/join` without the slash redirect to the slashed
URL (`html_handling: auto-trailing-slash`).

If the policy or support text changes, change the markdown in
`design/app-store/` and the HTML here together. The privacy page's
"Last updated" date is the day it was deployed. Before the first deploy it
reads `{{DATE}}`; replace that in `public/privacy/index.html` on deploy day.

## Other files

- `public/styles.css`: Paper and clay colours from `src/theme/tokens.ts`,
  serif headings (`ui-serif`, New York on Apple devices, Georgia-like
  fallbacks elsewhere), and the motion rules: one 900ms easeOutExpo arrival
  per screen, played once, with its parts 40-90ms apart; overshoot only for
  check-ins (the card's ticks, the week dots, the closing mark); slow
  ambient loops (the warm light, the card's float, today's dot); transform
  and opacity only; a reduced-motion block that shows everything finished.
- `public/site.js`: plays `.reveal` elements once as they scroll in, splits
  `[data-words]` headings into words that rise one after another, plays the
  landing card's day once the whole card is on screen (You, Dad and Nan
  check in, Mum still has today, then she moves and the streak goes from 24
  to 25), and fills in the join code. With reduced motion none of it plays
  and the card stays as written in the HTML.
- Landscapes: the same hills at dawn behind the hero (`.scene-dawn`) and at
  dusk behind the closing line (`.scene-dusk`). Each scene is four
  transparent WebP layers in `public/scenes/` (sky, far, mid, near), stacked
  as `<img data-depth>` so `site.js` can slide them at different speeds on
  scroll; layers only move down, so no gaps open. `public/grain.svg` sits on
  top for a printed feel.
- `scenes/` (not served): where those layers come from. `make_svg.py` draws
  each layer as SVG, with ridges from seeded noise (so the same every run),
  haze toward the distance, field texture and a soft sun glow; `bake.mjs`
  renders them to the WebP files with a headless Chromium (Playwright's
  cached headless shell, or set `CHROME`). To change colours or hills, edit
  `PAL` or `GEO` in `make_svg.py`, then from `site/scenes` run
  `python3 make_svg.py && node bake.mjs`. To use a photo instead, replace a
  scene's layers with one `<img class="layer">` in the same `.scene` div.
- `public/_headers`: security headers, including a content security policy
  that only allows the site's own files. Inline `style=""` and `<script>`
  won't run, so keep styles in `styles.css` and scripts in `site.js`.
- `worker.js`: runs before the files. Redirects `www.arrofamily.com` to
  `arrofamily.com` (301, path kept) and serves the join page for
  `/join/<code>`.
- `wrangler.jsonc`: the Worker, named `arrofamily`, with `public/` as its
  assets and both hostnames as custom domains. Only `public/` is uploaded,
  so this README and the config are never served.

## Preview

From this folder:

```sh
cd site
npx wrangler dev
```

Open http://localhost:8787. Wrangler isn't in the app's `package.json`;
`npx` runs it from its cache.

Opening `public/index.html` straight from Finder works too: the pages link
their files with relative paths (`styles.css`, `../styles.css`), and
`site.js` points folder links at `index.html` when the page is a file. Keep
new paths relative, or the page loses its styles when opened that way. The
404 page is the exception, with root paths, since the server shows it at any
depth. The www redirect can't be seen locally, since
the dev server answers on localhost.

## Deploy

From this folder, signed in to the Cloudflare account that holds
arrofamily.com (`npx wrangler whoami`):

```sh
cd site
npx wrangler deploy
```

The first deploy creates the DNS records and certificates for
`arrofamily.com` and `www.arrofamily.com` itself (`custom_domain: true`). It
fails if either hostname already has a DNS record, so check the zone's DNS
in the Cloudflare dashboard first. Then check:

```sh
for p in / /privacy/ /support/ /join/ /join/ABC234; do curl -s -o /dev/null -w "%{http_code} $p\n" https://arrofamily.com$p; done
curl -sI https://www.arrofamily.com/support/ | grep -i -E "^HTTP|^location"
```

Expect 200s, and a 301 from www to `https://arrofamily.com/support/`.

To take the site down: `npx wrangler delete` from this folder (it asks first).

## Email

The pages give `support@arrofamily.com`. It's meant to be forwarded to a
real inbox by Cloudflare Email Routing (free). Until that's set up, mail to
it bounces. Adding the forwarding inbox makes Cloudflare send it a
verification link that has to be clicked.
