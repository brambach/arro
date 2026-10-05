# Hosting the privacy and support pages

App Store Connect needs a privacy policy URL (App Privacy, and the TestFlight
Test Information page for external testers) and a support URL (each version).
The text is ready in `privacy-policy.md` and `support.md`. Nothing has been
bought or deployed.

## The options

| | Free subdomain now | Buy arrofamily.com first |
| --- | --- | --- |
| Cost | $0 | About $10-15 a year for a .com |
| URLs | `arro-family.vercel.app/privacy` or `<github-user>.github.io/arro/privacy` | `arrofamily.com/privacy`, `arrofamily.com/support` |
| Support email | Your own address, shown publicly on the support page | `support@arrofamily.com`, forwarded free to your inbox |
| Later | Swap URLs in App Store Connect when the domain exists. The privacy URL can be edited any time; the support URL changes with a new version | Nothing to swap |
| Risk | A public personal email address on the support page; a URL that looks temporary to reviewers and family | Someone else could still take the domain until it's bought |

## Recommendation: buy the domain now

Yes, buy it. It's already agreed, it's cheap, and it removes three things at
once: a URL swap later, putting a personal email address on a public page, and
the chance the name goes while you wait. TestFlight external testing asks for
the privacy URL anyway, so you need a real one before your family can install.

One way that keeps it all in one free account:

1. **Register** `arrofamily.com` at Cloudflare Registrar (sells at cost, no
   markup on renewal). Any registrar works; Namecheap or Porkbun are fine too.
2. **Host** the two pages on Cloudflare Pages or Vercel (both free for a static
   site) and attach the domain. Either needs the pages as HTML; I can turn the
   two markdown files into small Paper-and-clay HTML pages once you say which.
3. **Email**: Cloudflare Email Routing (free) forwards `support@arrofamily.com`
   to your own inbox. Replace `{{SUPPORT_EMAIL}}` in both pages with it.

Each of these is a purchase or deploy, so it's yours to do or to ask for
explicitly. Until then, the pages use `{{SUPPORT_EMAIL}}` as a placeholder.

## Invites don't link here yet

Invites the app sends today carry only the code: "Open Arro, tap “I have an
invite” and enter the code XXXXXX" (`src/state/invite.ts`). The
`https://arrofamily.com/join/<code>` link was taken out of the message because
the domain doesn't exist yet, so it would open a Safari error. `inviteLink()`
still builds it; put it back in the message once the domain is up with a
`/join/*` page, or with universal links in phase 5.

## URLs to put in App Store Connect

- Privacy Policy URL: `https://arrofamily.com/privacy`
- Support URL: `https://arrofamily.com/support`
