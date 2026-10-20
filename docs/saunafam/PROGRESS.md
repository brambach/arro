# Saunafam build 9: progress

The running memory for this build. Source of truth for what to build is
`design/saunafam-spec.md` (a copy of the spec). Update this file at the end of
every milestone: status, proof paths, decisions.

Branch: `feat/saunafam` (the brief names this branch; the spec's
`saunafam/build-9` is not used). Draft PR "Saunafam: build 9" against main.

## How to run the checks here

```bash
npm run typecheck
npm run lint                      # npx expo lint
npm test
supabase db start                 # or: supabase db reset, after changing migrations
scripts/test-db.sh                # pgTAP; see note below
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
```

- Docker here is Colima, which only mounts the home folder. The checkout lives
  under /tmp, so `supabase test db` can't see the test files ("no pgTAP tests
  found"). `scripts/test-db.sh` runs the same pg_prove image but copies the
  files into the container. CI still uses `supabase test db`.
- Local Supabase CLI is 2.117.0; CI pins 2.121.0.

## Milestones

| # | Status | Proof | Notes |
|---|---|---|---|
| M0 | done | `design/saunafam-lint-baseline.txt`, `design/saunafam-rename-list.txt` | baseline below |
| M13 | done (branch `saunafam/site`) | `design/screenshots/saunafam/site/`, `design/screenshots/saunafam/invite-link-preview.png`, `design/recordings/saunafam/site-first-load.mp4`, `design/lighthouse/*.json`, `site/worker.test.mjs` | Lighthouse 100/100/100/100 on all four pages, CLS 0. See M13 below |

## M0 baseline (untouched main, b68cd61)

- `npm run typecheck`: clean.
- `npm test`: 6 suites, 54 tests pass.
- pgTAP: 7 files, 192 tests pass.
- `deno check`: clean.
- Lint (new, `eslint-config-expo` flat config): 66 errors, 12 warnings on the
  old code, almost all React Compiler `react-hooks/refs` and
  `set-state-in-effect` rules in files the rebuild replaces. Recorded in
  `design/saunafam-lint-baseline.txt`; fixed as files are rewritten, and lint
  must be clean before the end.
- Rename search (`grep -rnw 'Arro'`): 311 lines, saved to
  `design/saunafam-rename-list.txt`.
- Xcode 26.6 and iPhone 17 / 17 Pro / 17 Pro Max simulators are available.
- No open PRs, and no branch has a `2026102*` migration, so the spec's six
  migration versions are free.

## Decisions

- D1. pgTAP is run with `scripts/test-db.sh` locally (see above).

## M13: landing page, join preview, privacy and support

Built on branch `saunafam/site` (worktree `/tmp/luna-arro/wt-site`), only in
`site/`, `design/app-store/privacy-policy.md` and the proof folders.

**Lighthouse mobile** (Lighthouse 12.8.2, `npx wrangler dev --local-upstream
localhost:8787`, headless Chrome for Testing 156):

| Page | Performance | Accessibility | Best Practices | SEO | CLS | LCP |
|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 0 | 1.5 s |
| `/privacy/` | 100 | 100 | 100 | 100 | 0 | 1.4 s |
| `/support/` | 100 | 100 | 100 | 100 | 0 | 1.4 s |
| `/join/ABC23456` | 100 | 100 | 100 | 100 | 0 | 1.4 s |

**curl against wrangler dev:**

```
200  /
200  /privacy/
200  /support/
200  /join/ABC23456        (title "Join with code ABC23456 · Saunafam", og:title has the code)
301  /join/abc23456/       Location /join/abc23456
301  /join/?code=abc23456  Location /join/ABC23456
404  /nope
```

wrangler dev rewrites every request to one host and ignores the Host
header, so `curl -H 'Host: arrofamily.com'` can't show the redirect there.
`node --test site/worker.test.mjs` (12 pass) calls the fetch handler with
fake requests instead:
`https://arrofamily.com/privacy/` 301 to `https://saunafam.com/privacy/`,
`https://www.arrofamily.com/support/?a=1&b=2` 301 to
`https://saunafam.com/support/?a=1&b=2`, `http://arrofamily.com/join/ABC23456`
301 to `https://saunafam.com/join/ABC23456`, `www.saunafam.com` and plain
http 301 to the https apex, and the apex serves files.

**Proof**
- Screenshots, full page: `design/screenshots/saunafam/site/home-360.png`,
  `home-390.png`, `home-768.png`, `home-1280.png`, `home-1920.png`,
  `join-390.png`.
- First load: `design/recordings/saunafam/site-first-load.mp4` (6.8 s, 1280
  wide, 0.2 MB): still frame, the settle, then the wall landing.
- Link preview: `design/screenshots/saunafam/invite-link-preview.png`, drawn
  by `site/scenes/link-preview.mjs` from the og:title, og:image, og:url and
  twitter:card the Worker actually served for `/join/ABC23456`.
- Social cards: `site/public/og/home.png`, `site/public/og/join.png` (1200 x
  630), from `site/scenes/render-og.mjs`.
- Reduced motion checked in Playwright: every settle item at opacity 1 with
  no transform, the wall shown, no glow loop.

**Decisions**
- D13.1 No public TestFlight link exists anywhere in the repo or the old
  site. Join the TestFlight and Get the app point at
  `mailto:support@saunafam.com?subject=TestFlight%20invite` and carry
  `data-testflight`; `site/README.md` says how to swap them.
- D13.2 `font-display: optional` with a preload, so Fraunces never swaps
  late. CLS stays 0 even on a slow first visit (that visit keeps a
  Georgia fallback with matched metrics).
- D13.3 The headline is the still first frame and never moves; the sub line,
  buttons and phone settle (1100 ms, 70 ms apart) 200 ms after fonts and a
  painted frame. That keeps the LCP element painted at once.
- D13.4 The join page drops `noindex` (it cost the SEO score) and uses a
  canonical to `https://saunafam.com/join/` instead, so codes don't get
  indexed as separate pages.
- D13.5 The worker writes the code into the join page server side with
  HTMLRewriter, so previews show it without JS. The page no longer reads
  the code in JS.
- D13.6 Caps labels on the site use smoke `#55504A`, not stone: stone on
  birch is about 3:1, under WCAG AA for 12 px text.
- D13.7 Temporary favicon set (stone on birch) at the exact names the icon
  pipeline will overwrite. The header wordmark is Fraunces text in one
  `<a class="wordmark">` until `assets/brand/wordmark.svg` lands.
- D13.8 Supabase region on the privacy page says "the United States", as
  the Arro policy did; the spec marks the exact region unverified.

**Not done / for others**
- `design/app-store/support.md` still has Arro's text (outside this task's
  files). The live support page is new.
- Deploy, DNS, Email Routing for support@saunafam.com: Bryce's steps, in
  `site/README.md`.
