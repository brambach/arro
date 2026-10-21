# Saunafam on the App Store

Everything for App Store Connect and TestFlight that isn't app code, for
Saunafam build 9 and the later version that turns Plus on. Source:
`design/saunafam-spec.md`, sections 5 to 7 and "Paid tier". Nothing here has
been entered in App Store Connect, RevenueCat or the hosted Supabase project.
Each of those is Bryce's step, on his go.

| File | What it's for |
| --- | --- |
| `listing.md` | Name, subtitle, promotional text, description, keywords, categories, URLs, age rating answers, screenshot captions, the five in-app purchases |
| `app-privacy.md` | App Store Connect App Privacy answers, with what RevenueCat collects |
| `privacy-policy.md` | The privacy policy, the same text as `https://saunafam.com/privacy` |
| `support.md` | The support page, the same text as `https://saunafam.com/support` |
| `hosting.md` | Where those pages live, and the URLs for App Store Connect |
| `review-notes.md` | Review notes, the demo family the server needs, and what App Review checks |
| `screenshots.md` | Apple's current screenshot sizes, the six screenshots and their captions |
| `testflight.md` | The build 9 rollout, in order, and the tester note |
| `icon-options.md`, `icon-options/` | Arro's icon options, kept for the record |

## Open items for Bryce

1. **Deploy saunafam.com**, DNS and email routing (`site/README.md`).
2. **Rename the app** in App Store Connect and paste `listing.md`.
3. **Confirm the age rating answers** in `listing.md`, especially under 13,
   Social Media and Health or Wellness Topics.
4. **App Privacy:** update from `app-privacy.md` before build 9's Beta App
   Review.
5. **Demo family** on the server, made on the day you submit
   (`review-notes.md`).
6. **Plus, after build 9 ships:** the App Store Connect and RevenueCat steps in
   the spec's "Paid tier", then the Plus parts of `listing.md`.
