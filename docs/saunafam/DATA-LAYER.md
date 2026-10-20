# Saunafam data layer (M5): a guide for the screen agents

Screens read one view model and call actions. They never import `backend.ts`.

```ts
const view = useView();           // AppView, src/state/buildView.ts
const app = useApp();             // actions and app state, src/state/AppState.tsx
```

Every string about weeks, streaks and sessions is already in the view. Don't
rebuild copy in a screen; if a line is missing, add it to `buildView.ts` with a
test in `src/state/__tests__/buildView.test.ts`.

The screens in `src/screens/` right now are plain stand-ins (`src/screens/plain.tsx`)
that print the view as text. Replace them; delete `plain.tsx` once nothing uses it.

## Status, cache and offline

- `view.status`: `'ready'`, `'loading'` (nothing cached yet) or `'error'`
  (nothing cached and the fetch failed). In loading and error the view is still
  complete, built from a placeholder family with just you, so a screen can draw
  its skeleton without null checks.
- `view.offline`: the last request couldn't reach the server. Cached data stays
  on screen.
- Screens render from the cache (`arro.family.v2`) first; `app.refresh()` runs on
  launch, on coming back to the app, and after writes. Pull to refresh calls it too.
- `app.notice`: a quiet message after an optimistic change was rolled back
  ("Couldn't send that cheer. Try again."). Show it, then `app.clearNotice()`.
- `view.updateRequired`: this build (`src/state/appBuild.ts`, 9) is under
  `app_config.min_ios_build`. Show "A new version of Saunafam is ready..." (`COPY.updateRequired`).
- `app.welcomeDue` / `app.dismissWelcome()`: the one-time "Arro is now Saunafam" sheet
  for testers who were signed in before build 9.

## What each screen reads

| Screen | Read | Notes |
|---|---|---|
| Today | `view.today` | `greeting`, `dateLabel`; `you` (dots, "2 of 3 this week" or "Kept this week"); `familyLine` (only names progress, never you); `streak` (`kind` solo, building or broken; `value` + `label`: 8 "weeks together", or after a break 7 "weeks together this year"); `soloInvite`; `backAtIt`; `forgot` ("Log yesterday's", or Monday morning's "Did you sauna on Sunday? Log it"; null once yesterday closes); `family` rows; `drafts` ("Couldn't save this one. Tap to fix it"); `waiting` (outbox count). Timer bar: `view.timer` plus `timerBarLabel(timer, now)` from `timer.ts` with your own 1 s tick. Milestone: `view.milestone` |
| Family rows (Today, Week) | `FamilyRow` | `member`, `dots` (`boolean[]`, one per goal session), `status` ("Kept", "2 of 3", "On a break until Friday", "Invited"), `state`, `tap`: `{kind:'nudge', memberId}`, `{kind:'session', sessionId}`, `{kind:'invite'}` or `{kind:'none'}` (someone on a break) |
| Week | `view.week` | `wall.slats` (oldest first, last is `current`; `state` counted, broken, pending, skip or solo; `freezeUsed`), `wall.wood`; `numbers` (streak, longest, this year); `rows`; `myStrip` (7 `DayCell`s, letters follow the family's week start); `past` (label "Week of Oct 5: kept", "kept, a freeze was used", and only in your own view "kept, your freeze was used"; `members` with status and `daysLabel` for the tap-to-open detail); `seeEveryWeek`, `printWall` (Plus, only with plus_enabled); `nag` |
| Feed | `view.feed` | `sections` (`thisWeek`, `lastWeek`; empty ones left out), `empty`. Each `FeedCard`: `title` ("Maya, Jo and you had a sauna together"), `details` ("20 min · Traditional · 85°C", °F by region), `when`, `place`, `note`, `photoUri`, `coldPlunge`, `cheers` (`count`, `line` "You and Jo cheered", `byMe`), `canCheer`, `cheerLabel` ("Cheer Maya on"), `comments`, `quickReplies`, `mine`, `imIn`, `pending`, `canEdit`, `canDelete`, `canRemoveMe` |
| Session detail | `view.sessions[sessionId]` | Same `FeedCard`, found by the anchor id or any row id (pushes send the anchor). `rows` has every row, anchor first, for the edit form. Missing means it was deleted |
| Me | `view.profile` | `stats` (weeks in a row, longest, sessions this month, hours this year), `favoriteType`, `favoritePlace`, `recent` (your last three, as `FeedCard`s), `badges` (4, 8, 12, 26, 52 with `earned`), `plusRows` |
| Log form | `view.sessionCompanions`, `view.recentPlaces`, `view.minMinutes`, `view.unit`, `app.lastSaunaType` | `COPY.shortSession(min)` for the line under minutes. Lists and limits are in `src/data/saunas.ts`: `SAUNA_TYPES`, `saunaTypeLabels`, `MINUTE_CHIPS`, `LIMITS`, `fToC`, `temperatureRange` |
| Settings | `view.rules`, `view.myBreak`, `view.myPauses`, `view.plus`, `view.weekendCheckin`, `session.me.reminderDays/reminderTime/remindersWanted` | `rules.summary` ("3 sessions a week, 10 minutes or more"), `rules.pendingChange.label` ("Starting Monday, Oct 26"), `rules.canEdit` (founder). `plus.rowLabel` ("Plus, from Maya"). `clockTimeLabel`, `reminderDaysLabel` in `reminders.ts` |
| Milestone | `view.milestone` | `{kind, weeks, title, subtitle}`; call `app.markMilestoneShown()` when it closes |
| Members, Nudge | `view.allMembers`, `view.members[id]`, `view.isFounder` | |

## Actions

Optimistic means the screen changes at once and quietly rolls back (with `app.notice`)
if the server says no.

| Action | Behavior |
|---|---|
| `logSession(form)` | Optimistic and offline safe. Goes into the outbox with a client id made on the phone, shows on Today and in the feed as yours (`pending: true`) straight away, then sends. Resolves after the first try: `{status:'saved', skippedNames}` ("Jo already logged this one"), `{status:'waiting'}` (offline, it'll retry), or `{status:'refused', message}` (kept as a draft). Never logs twice |
| `resendDraft(clientId, form)`, `discardDraft(clientId)`, `draftFor(clientId)` | Fix or throw away a refused draft (`LogSession` route with `draftId`) |
| `cheer(anchorId)`, `uncheer(anchorId)` | Optimistic |
| `comment(anchorId, body)`, `deleteComment(id)` | Optimistic. A 21st comment in a day rolls back with "That's 20 comments today..." |
| `removeMe(anchorId)` | Optimistic: your row goes, the card stays for the others |
| `deleteSession(anchorId)` | Optimistic: the whole session goes (logger only) |
| `updateProfile({name, photoUri})` | Optimistic |
| `editSession(anchorId, changes)`, `setSessionPhoto(anchorId, uri)` | Not optimistic; throws the server error for the form to show |
| `nudge(memberId)` | `'sent'` or `'already'` |
| `takeBreak(days)`, `endBreak()`, `setRules(goal, min)` (returns "Starting ..."), `setReminders({wanted, days, time})`, `setWeekendCheckin(on)`, `turnOnNotifications()`, `addInvite(name)`, `removeMember(id)` | Plain writes, then refresh |
| `buyPlus(pkg)`, `restorePurchases()`, `setWallWood(wood)` | Plus. `setWallWood` throws `NeedsPlusError` without Plus (show the try-on). Never decide Plus locally: these call `sync-plus` and refresh `family_plus` |
| `recordNagShown()`, `dismissNag()`, `turnOffNag()` | The quiet Plus card. When `view.week.nag` is `'new'`, show it and call `recordNagShown()` once |
| `signOut()`, `checkBeforeDelete()` (`paysForPlus`), `deleteAccount()` | Sign out discards a running timer and anything unsent; warn first (`view.timer`, `view.today.waiting`) |

## Timer

State lives in `saunafam.timer.v1`; time is always worked out from timestamps.
Math is pure in `src/state/timer.ts`; AppState holds the one running timer.

```ts
app.startTimer({ targetMinutes?, saunaType? })  // returns the running one if there is one
app.coolOff()          // "Add a round": heat clock pauses ("Cooling off")
app.resumeTimer()      // back in the heat, next round
app.setTimerTarget(m)  // TARGET_CHOICES: 10, 15, 20, 30
app.setTimerSaunaType(t)
app.finishTimer()      // TimerResult {startedAt, localDate, durationMinutes, rounds, saunaType}; clears it
app.discardTimer()
```

Read it with `view.timer` and, on your own tick: `heatMs`, `coolingMs`,
`continuousHeatMs`, `phase`, `clockLabel` ("12:04"), `timerBarLabel` ("In the heat · 12:04"),
`isStale` (3 hours: "Still going? It's been 3 hours"), `announcement` (VoiceOver,
every 5 minutes). The default target is `defaultTargetMinutes(view.minMinutes)`;
the default type is the last one used. Finishing while cooling drops the open
cooling stretch; a session that crosses midnight is dated by its start. The
target and 45-minute local notifications are scheduled and cancelled by the
actions above. Pass `finishTimer()`'s result to the form:
`navigation.navigate('LogSession', { fromTimer: true, prefill: result })`.

## Preview scenarios

The dev-only Prototype preview (Settings) switches scenarios with
`app.setPreview(id)`, or `null` for your real family. Without Supabase settings
the app always shows the `family` scenario. Scenarios live in
`src/data/preview.ts` (`PREVIEW_SCENARIOS`); the preview runs on its own clock,
Thursday of the current week at 4:10 PM (Monday 8:10 AM for `mondayOpen`), and
you are Sam.

| id | What it shows |
|---|---|
| `family` | Sunday sauna: Sam, Maya and Jo, 8 weeks together, Maya's freeze in one week, a shared session, cheers, comments, a short session |
| `solo` | Just Sam, Maya invited |
| `newFamily` | Started this week, nothing logged |
| `brokenStreak` | Broken last week: weeks together this year, "Back at it, together" |
| `onBreak` | Jo on a break until Saturday |
| `mondayOpen` | Monday morning, Sam's last week used his freeze: "Did you sauna on Sunday? Log it" |
| `milestone` | The 8-week milestone is due |
| `timerRunning`, `timerStale` | A timer 12 minutes in; one 3 hours 10 in |
| `offline` | Offline with one session waiting in the outbox |
| `draft` | A session the server refused |
| `plusEnabled` | plus_enabled on, no Plus, the quiet card due |
| `plusActive` | Plus from Maya, cedar wall |
| `sundayStart` | A Sunday-start week |
| `updateRequired` | min_ios_build above this build |
| `loading`, `error` | Nothing cached |

Actions work in memory in the preview. `app.setPreviewPurchases(behavior)` makes
the fake App Store `succeed`, `fail`, `cancel`, go `pending`, find
`nothingToRestore`, or be `offline`.

## Stored on the phone

`arro.session.v1` (kept; older shapes are read), `arro.family.v2` (the cache),
Supabase's auth key, `saunafam.outbox.v1`, `saunafam.draft.v1`,
`saunafam.timer.v1`, `saunafam.lastSaunaType.v1`, `saunafam.milestones.v1`,
`saunafam.plusNag.v1`, `saunafam.welcomed.v1`. `arro.family.v1` and
`arro.moveMethod.v1` are deleted on launch, and so is every pending
notification starting `arro-`.

## Seams left for later milestones

- M11 Health: `saveMindfulMinutes(session)` in `src/state/health.ts` is a no-op stub,
  already called after each session is saved.
- M15 RevenueCat: `createPurchases()` in `src/state/purchases.ts` returns
  `PreviewPurchases`; return a `RevenueCatPurchases` there.
- M8 Timer and log form, M9 main screens, M10 onboarding and Settings: replace the
  plain screens. Onboarding's `Draft` already has `goal`, `minMinutes`,
  `weekStartsOn`, `reminderDays` and `reminderTime` for the "Your rhythm" step.
