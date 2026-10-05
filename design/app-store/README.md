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

1. **Pick an icon** (A, B or C in `icon-options.md`), then OK the `sharp`
   install so the files can be regenerated.
2. **Buy arrofamily.com** and choose a host for the two pages (`hosting.md`).
   Then replace `{{SUPPORT_EMAIL}}` and `{{DATE}}` in the pages.
3. **App changes before review** (other threads): hide the placeholder comment
   bar on Workout detail, and apply the app.json changes in `testflight.md`.
4. **Demo family** on the server for App Review (`review-notes.md`), made on
   the day you submit for external testing.
5. **Re-check `app-privacy.md`** after phase 4 lands (push tokens) and when
   photos start uploading.
