# Family

A person sees who's in their family and invites someone with the family code.

## Sub-features

- `fam-list` Family members: each person, who started it, Remove for the founder.
- `fam-invite` the invite sheet: the code, the join link, "Who's it for?".
- `fam-dismiss` swiping the sheet away.

## How to get to it (user POV)

- Me, the gear at the top right, Settings, "Family members".
- Onboarding's "Invite your family" step (see [onboarding.md](onboarding.md)).

## Driving it with verify.mjs

Preconditions:

- Onboarded with the preview family. Run `node $V tap-text "Me"` to start from the Me tab.

- **Settings.** The gear has no text: run `node $V tap 356 103`. `find` reads "Settings" and "Family members".
- **Members.** Run `node $V tap-text "Family members"`. `find` reads "3 people in Sunday sauna. Up to 12 can join.", "Sam (you)", "Started the family", "Maya", "Jo" and two "Remove".
- **Invite.** Run `node $V tap-text "Invite someone"`. `find` reads "Invite someone", "YOUR FAMILY'S CODE", "SAUNA234" and "saunafam.com/join/SAUNA234".
- **Dismiss.** Swipe the sheet down: `node $V drag 200 120 200 760`. `find` reads "Family members" again.
- **Back.** The back chevron is at `node $V tap 30 84`.

## Gotchas

- The gear sits at (356, 103) on the iPhone 17 Pro at the default size. On
  another phone or text size, look at a screenshot for it.
- "Send invite" opens the iOS share sheet, which is outside the app.
- Remove asks "Remove <name>?" before doing anything. Only the founder sees it.
