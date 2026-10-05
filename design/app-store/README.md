# Arro on the App Store: phase 6 prep

Everything for App Store Connect and TestFlight that isn't app code. Phase 6 of
`design/refactor-plan.md`. Nothing here has been bought, deployed, uploaded or
done in the Apple account.

| File | What it's for |
| --- | --- |
| `testflight.md` | The route to the first TestFlight build (Xcode Archive, recommended, vs EAS), the app.json changes, and what you do in App Store Connect |
| `listing.md` | Name, subtitle, promotional text, description, keywords, category, age rating |
| `privacy-policy.md` | Privacy policy, ready to host |
| `support.md` | Support page, ready to host |
| `hosting.md` | Where those two pages live (recommendation: buy arrofamily.com) |
| `app-privacy.md` | App Store Connect App Privacy answers, checked against the code |
| `review-notes.md` | Review notes, the demo family the server needs, and what to fix before review |
| `screenshots.md` | The four screenshots, their order, captions and how to capture them |
| `icon-options.md`, `icon-options/` | Three Paper and clay icon options with previews |

## Open items

1. **Buy arrofamily.com** and choose a host for the two pages (`hosting.md`).
   Then replace `{{SUPPORT_EMAIL}}` and `{{DATE}}` in the pages.
2. **Demo family** on the server for App Review (`review-notes.md`), made on
   the day you submit for external testing.
3. **Re-check `app-privacy.md`** when photos start uploading. Push tokens from
   phase 4 are already covered there and in the privacy policy; if a build
   ships without notifications, the policy's notifications paragraph can stay,
   since it only applies "if you allow them".

Done by the phase 4 thread: the placeholder comment bar is gone from Workout
detail, and app.json has the build number, encryption flag and photo text from
`testflight.md`.

Done: icon A (clay tile, paper "a") is in `assets/`; see `icon-options.md`.
