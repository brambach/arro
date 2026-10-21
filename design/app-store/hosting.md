# Hosting the privacy and support pages

App Store Connect needs a privacy policy URL (App Privacy, and TestFlight's
Test Information page for external testers) and a support URL (each version).
Both live on saunafam.com, served by the Cloudflare Worker in `site/`.

## Where things are

| Page | Live URL | Source | Markdown copy |
|---|---|---|---|
| Home | `https://saunafam.com` | `site/public/index.html` | |
| Privacy | `https://saunafam.com/privacy` | `site/public/privacy/index.html` | `privacy-policy.md` |
| Support | `https://saunafam.com/support` | `site/public/support/index.html` | `support.md` |
| Join | `https://saunafam.com/join/<code>` | `site/worker.js` writes the code into `site/public/join/` | |

Change a page and its markdown copy together.

## Status (20 October 2026)

- **saunafam.com is registered** in Bryce's Cloudflare account, the same one
  that runs the arrofamily.com Worker. Nothing to buy.
- **Not deployed yet.** The Worker, routes and redirects are written and
  tested locally (`docs/saunafam/PROGRESS.md`, M13). Deploying, DNS and email
  routing are Bryce's steps, in `site/README.md`.
- **arrofamily.com redirects.** `site/worker.js` sends any arrofamily.com
  request to the same path on `https://saunafam.com` with a 301, so build 8
  invite links and Arro's App Store privacy URL keep working. Keep it for at
  least 12 months (spec Default).
- **Support email** `support@saunafam.com`, forwarded with Cloudflare Email
  Routing once Bryce sets it up. Until then mail to it bounces.

## URLs for App Store Connect

- Privacy Policy URL: `https://saunafam.com/privacy`
- Support URL: `https://saunafam.com/support`
- Marketing URL: `https://saunafam.com`

Deploy the site before changing them, then check:

```
for p in / /privacy/ /support/ /join/ABC23456; do curl -s -o /dev/null -w "%{http_code} $p\n" https://saunafam.com$p; done
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://arrofamily.com/privacy/
```

## Invites

The invite message carries the code and, once the site is live, the link
`https://saunafam.com/join/<code>` (spec, section 3, "Invites"). The join page
shows the code and a Get the app button. Its og:title and og:image make it
show as a card in iMessage (`design/screenshots/saunafam/invite-link-preview.png`).
