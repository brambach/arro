import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { COPY } from '../state/buildView';
import { LIMITS, MINUTE_CHIPS, SAUNA_TYPES, plural } from '../data/saunas';
import { defaultTargetMinutes } from '../state/timer';
import { yesterdayClosedAt, yesterdayOpen } from '../state/dates';
import {
  LogDay,
  LogFormErrors,
  LogFormField,
  LogFormState,
  MAX_COMPANIONS,
  canStepLater,
  draftReason,
  firstError,
  initialForm,
  isDirty,
  isShort,
  parseWhole,
  skippedLine,
  startLabel,
  stepStart,
  toSessionForm,
  toggleCompanion,
  validate,
  withDay,
  withMinutes,
} from '../state/logForm';
import { PhotoSource, pickSessionPhoto } from '../state/sessionPhoto';
import { alpha, depth, layout, palette, radii, space } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';
import { haptics } from '../theme/haptics';
import { Backdrop } from '../components/Backdrop';
import { Field } from '../components/Field';
import { Toggle } from '../components/Toggle';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';
import { OptionChip } from '../components/OptionChip';
import { Segmented } from '../components/Segmented';
import { Stepper } from '../components/Stepper';
import { SaunaTypeTile } from '../components/SaunaTypeTile';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNow } from '../components/useNow';
import { onDevCommand } from '../dev/capture';

type Params = NonNullable<RootStackParamList['LogSession']>;

/**
 * The log form route: the sheet over whatever opened it (Today's "Log one I
 * already did", "Log yesterday's", a draft to fix). The route is a transparent
 * modal; the sheet draws its own scrim and slide.
 */
export function LogSessionScreen({ navigation, route }: RootStackScreenProps<'LogSession'>) {
  return <LogSessionSheet params={route.params ?? {}} onClosed={() => navigation.goBack()} />;
}

/**
 * The log form, as a designed sheet (spec section 3, Log session form). The
 * timer shows it in place as its room lightens; the LogSession route shows it
 * over Today. `onClosed` runs once it has slid away.
 *
 * Every control is Saunafam's own, with a label and a role. Checks are inline,
 * in coal, and only after the first Save. Saving is optimistic: the session goes
 * into the outbox, the sheet closes with the save haptic, and Today has it at once.
 */
export function LogSessionSheet({
  params,
  onClosed,
  hold = false,
}: {
  params: Params;
  onClosed: () => void;
  /**
   * Mounted but parked below the screen until this turns false. The timer
   * mounts the sheet as its glow starts to cool, so drawing it never stalls
   * the moment the room lightens.
   */
  hold?: boolean;
}) {
  const app = useApp();
  const view = useView();
  const insets = useSafeAreaInsets();
  const { height: H, fontScale } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const now = useNow(true, 60_000);

  const draft = params.draftId ? app.draftFor(params.draftId) : null;
  const unit = view.unit;
  const source = params.fromTimer ? 'timer' : (draft?.input.source ?? 'manual');
  const [start] = useState(() =>
    initialForm({
      now: new Date(),
      unit,
      lastSaunaType: app.lastSaunaType,
      day: params.day,
      prefill: params.prefill,
      askTime: params.askTime,
      draft,
      defaultMinutes: defaultTargetMinutes(view.minMinutes),
    }),
  );
  const [form, setForm] = useState<LogFormState>(start.state);
  const [checked, setChecked] = useState(false);
  const refusal = draft ? draftReason(draft.message) : null;
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors: LogFormErrors = checked ? validate(form, unit, now) : {};
  const whenNote = errors.when ?? (form.day === start.state.day && !form.startTouched ? start.whenNote : null);

  // ─── The sheet's motion ──────────────────────────────────────────────────

  const sheetH = H - insets.top - space.s8;
  const y = useSharedValue(sheetH);
  const scrim = useSharedValue(0);
  const fade = useSharedValue(1);
  // The fields below the first screenful are drawn once the sheet is up, so
  // mounting it is light and its rise never stalls.
  const [rest, setRest] = useState(false);
  const shown = useRef(false);
  useEffect(() => {
    if (reduceMotion === null || hold || shown.current) return;
    shown.current = true;
    // A beat after it lands, so the room has finished lightening first.
    const later = () => setTimeout(() => setRest(true), moments.roomPanel.duration);
    if (reduceMotion) {
      y.set(0);
      fade.set(0);
      fade.set(withTiming(1, timing.utility, (f) => f && scheduleOnRN(later)));
    } else {
      y.set(withSpring(0, moments.sheet.open, (f) => f && scheduleOnRN(later)));
    }
    scrim.set(withTiming(1, moments.sheet.scrim));
    // Opens once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, hold]);

  const closed = useRef(false);
  const slideAway = useCallback(
    (after?: () => void) => {
      if (closed.current) return;
      closed.current = true;
      const done = () => {
        after?.();
        onClosed();
      };
      scrim.set(withTiming(0, moments.sheet.close));
      if (reduceMotion !== false) {
        fade.set(withTiming(0, timing.utility, (f) => f && scheduleOnRN(done)));
      } else {
        y.set(withTiming(sheetH, moments.sheet.close, (f) => f && scheduleOnRN(done)));
      }
    },
    [fade, onClosed, reduceMotion, scrim, sheetH, y],
  );

  const sheetStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: Math.max(0, y.value) }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  const dirty = isDirty(form, start.state);
  const fromTimer = !!params.fromTimer;
  const hasDraft = !!draft;
  const askClose = useCallback(() => {
    // A timer's session is lost if the sheet closes, so it asks. So does anything typed in.
    if (fromTimer || (dirty && !hasDraft)) setConfirmClose(true);
    else slideAway();
  }, [fromTimer, dirty, hasDraft, slideAway]);

  // Drag the handle down to close (the responder props, no gesture library).
  const dragFrom = useSharedValue(0);
  const dragAt = useSharedValue(0);
  const drag = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      dragFrom.set(e.nativeEvent.pageY);
      dragAt.set(e.nativeEvent.timestamp);
    },
    onResponderMove: (e: GestureResponderEvent) => y.set(Math.max(0, e.nativeEvent.pageY - dragFrom.get())),
    onResponderRelease: (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - dragFrom.get();
      const speed = dy / Math.max(1, e.nativeEvent.timestamp - dragAt.get());
      y.set(withSpring(0, moments.sheet.open));
      if (dy > moments.sheet.dismissDrag || (dy > space.s24 && speed > 1)) askClose();
    },
    onResponderTerminate: () => y.set(withSpring(0, moments.sheet.open)),
  };

  // ─── Fields ──────────────────────────────────────────────────────────────

  const scroll = useRef<ScrollView>(null);
  // Where each field sits in the scroll view, for scrolling to the first one to fix.
  const [spots] = useState(() => new Map<LogFormField, number>());
  const spot = (field: LogFormField) => (e: { nativeEvent: { layout: { y: number } } }) => {
    spots.set(field, e.nativeEvent.layout.y);
  };
  const set = (patch: Partial<LogFormState>) => setForm((f) => ({ ...f, ...patch }));
  const yesterday = yesterdayOpen(now);

  const companions = view.sessionCompanions;
  const invited = view.allMembers.filter((m) => m.invited);
  const breakIds = new Set(view.today.family.filter((r) => r.state === 'break').map((r) => r.member.id));
  const full = form.withIds.length >= MAX_COMPANIONS;

  // ─── Saving ──────────────────────────────────────────────────────────────

  const save = async () => {
    if (saving) return;
    const found = validate(form, unit, new Date());
    setChecked(true);
    const first = firstError(found);
    if (first) {
      haptics.error();
      scroll.current?.scrollTo({ y: Math.max(0, (spots.get(first) ?? 0) - space.s24), animated: reduceMotion === false });
      AccessibilityInfo.announceForAccessibility(found[first] ?? '');
      return;
    }
    setSaving(true);
    const session = toSessionForm(form, unit, new Date(), source);
    const sent = draft ? app.resendDraft(draft.input.clientId, session) : app.logSession(session);
    // Optimistic: the session is on Today already; the sheet goes, and the save
    // haptic lands as it does.
    slideAway(() => haptics.save());
    sent
      .then((outcome) => {
        if (outcome.status === 'saved') {
          const line = skippedLine(outcome.skippedNames);
          if (line) app.showNotice(line);
        }
      })
      .catch(() => undefined);
  };

  const discardDraft = async () => {
    if (!draft) return;
    await app.discardDraft(draft.input.clientId);
    slideAway();
  };

  useEffect(
    () =>
      onDevCommand((cmd, args) => {
        if (cmd === 'form-pick') {
          const ids = view.sessionCompanions.slice(0, Number(args.n ?? 2)).map((m) => m.id);
          setForm((f) => ({ ...f, withIds: ids }));
        } else if (cmd === 'form-minutes') setForm((f) => withMinutes(f, args.v ?? '', new Date()));
        else if (cmd === 'form-save') save();
        else if (cmd === 'form-scroll') scroll.current?.scrollTo({ y: Number(args.y ?? 0), animated: false });
        else if (cmd === 'form-fill') setForm((f) => ({ ...f, temp: args.temp ?? f.temp, humidity: args.hum ?? f.humidity, place: args.place ?? f.place, note: args.note ?? f.note, coldPlunge: args.cold === '1' || f.coldPlunge }));
        else if (cmd === 'form-close') askClose();
        else if (cmd === 'form-discard') slideAway();
      }),
    // Dev captures only; the latest handlers each time.
  );

  const title = params.fromTimer ? 'Log this session' : draft ? 'Fix this session' : 'Log a session';
  const wide = fontScale <= 1.3;
  const saveButton = (
    <View style={wide ? undefined : [styles.section, { paddingBottom: insets.bottom }]}>
      <SolidButton size="large" title={draft ? 'Save again' : 'Save session'} onPress={save} disabled={saving} />
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={askClose} importantForAccessibility="no" accessibilityElementsHidden />
      </Animated.View>

      <Animated.View style={[styles.sheet, { height: sheetH }, sheetStyle]} accessibilityViewIsModal>
        <Backdrop haze={false} seed={11} />
        <View {...drag} style={styles.head}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Text style={[type.heading, styles.title]} maxFontSizeMultiplier={maxFontScale.heading} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={askClose}
              hitSlop={space.s8}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name="close" size={20} color={palette.smoke} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {refusal ? (
            <View style={styles.refusal} accessibilityRole="alert">
              <View style={styles.flex}>
                <Text style={[type.bodyStrong, styles.coal]}>Couldn’t save this one</Text>
                <Text style={type.bodySmall}>{refusal} Fix it here and save again.</Text>
              </View>
            </View>
          ) : null}

          {/* When */}
          <View onLayout={spot('when')} style={styles.section}>
            <Label text="When" />
            <Segmented<LogDay>
              accessibilityLabel="When"
              value={form.day}
              onChange={(d) => setForm((f) => withDay(f, d, new Date()))}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday', disabled: !yesterday && form.day !== 'yesterday' },
              ]}
            />
            <View style={styles.gap12} />
            <Stepper
              label="Start time"
              display={`Started ${startLabel(form.startMinutes)}`}
              spoken={`Started at ${startLabel(form.startMinutes)}`}
              canDecrement={form.startMinutes > 0}
              canIncrement={canStepLater(form, now)}
              onDecrement={() => set({ startMinutes: stepStart(form, -1, new Date()), startTouched: true })}
              onIncrement={() => set({ startMinutes: stepStart(form, 1, new Date()), startTouched: true })}
            />
            {whenNote ? <Note text={whenNote} error /> : !yesterday && form.day === 'today' ? <Note text={`Yesterday closed at ${yesterdayClosedAt(now)}.`} /> : null}
          </View>

          {/* Minutes */}
          <View onLayout={spot('minutes')} style={styles.section}>
            <Field
              label="Minutes"
              value={form.minutes}
              onChangeText={(t) => setForm((f) => withMinutes(f, t.replace(/[^0-9]/g, ''), new Date()))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={params.askTime ? 'How long were you in?' : '15'}
              error={errors.minutes}
              hint={params.askTime && !errors.minutes ? 'The timer ran for hours. Put in your real time.' : undefined}
              accessibilityLabel={`Minutes, ${LIMITS.minutes.min} to ${LIMITS.minutes.max}`}
              returnKeyType="done"
            />
            <View style={styles.chips}>
              {MINUTE_CHIPS.map((m) => (
                <OptionChip
                  key={m}
                  label={`${m}`}
                  accessibilityLabel={`${m} minutes`}
                  selected={parseWhole(form.minutes) === m}
                  onPress={() => setForm((f) => withMinutes(f, String(m), new Date()))}
                />
              ))}
            </View>
            {isShort(form, view.minMinutes) ? <Note text={COPY.shortSession(view.minMinutes)} /> : null}
          </View>

          {/* Sauna type */}
          <View style={styles.section}>
            <Label text="Sauna" />
            <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Sauna type">
              {pairs(SAUNA_TYPES).map((row) => (
                <View key={row[0]} style={styles.gridRow}>
                  {row.map((t) => (
                    <SaunaTypeTile key={t} saunaType={t} selected={form.saunaType === t} onPress={() => set({ saunaType: t })} />
                  ))}
                  {row.length === 1 ? <View style={styles.flex} /> : null}
                </View>
              ))}
            </View>
          </View>

          {rest ? (
          <>
          {/* Temperature and humidity */}
          <View onLayout={spot('temp')} style={[styles.section, wide && styles.row]}>
            <Field
              wrapStyle={wide ? styles.flex : undefined}
              label={`Temperature, °${unit}`}
              value={form.temp}
              onChangeText={(t) => set({ temp: t.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={unit === 'F' ? '185' : '85'}
              error={errors.temp}
              accessibilityLabel={`Temperature in degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}, optional`}
            />
            <View onLayout={wide ? undefined : spot('humidity')} style={wide ? styles.flex : styles.stackGap}>
              <Field
                label="Humidity, %"
                value={form.humidity}
                onChangeText={(t) => set({ humidity: t.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="20"
                error={errors.humidity}
                accessibilityLabel="Humidity in percent, optional"
              />
            </View>
          </View>

          {/* Rounds */}
          <View style={styles.section}>
            <Label text="Rounds" />
            <Stepper
              label="Rounds"
              display={String(form.rounds)}
              spoken={plural(form.rounds, 'round')}
              canDecrement={form.rounds > LIMITS.rounds.min}
              canIncrement={form.rounds < LIMITS.rounds.max}
              onDecrement={() => set({ rounds: Math.max(LIMITS.rounds.min, form.rounds - 1) })}
              onIncrement={() => set({ rounds: Math.min(LIMITS.rounds.max, form.rounds + 1) })}
            />
          </View>

          {/* Cold plunge */}
          <View onLayout={spot('coldMinutes')} style={styles.section}>
            <View style={styles.plunge}>
              <Icon name="snowflake" size={22} color={palette.lake} />
              <Text style={[type.bodyStrong, styles.flex]}>Cold plunge</Text>
              <Toggle value={form.coldPlunge} onValueChange={(v) => set({ coldPlunge: v })} accessibilityLabel="Cold plunge" />
            </View>
            {form.coldPlunge ? (
              <Field
                wrapStyle={styles.gapTop}
                label="Minutes in the cold"
                value={form.coldMinutes}
                onChangeText={(t) => set({ coldMinutes: t.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="2"
                error={errors.coldMinutes}
                accessibilityLabel={`Minutes in the cold, up to ${LIMITS.coldMinutes.max}, optional`}
              />
            ) : null}
          </View>

          {/* Place */}
          <View onLayout={spot('place')} style={styles.section}>
            <Field
              label="Place"
              value={form.place}
              onChangeText={(t) => set({ place: t })}
              maxLength={LIMITS.place}
              placeholder="Home, The Y"
              autoCapitalize="words"
              error={errors.place}
              accessibilityLabel="Place, optional"
              returnKeyType="done"
            />
            {view.recentPlaces.length ? (
              <View style={styles.chips}>
                {view.recentPlaces.slice(0, 5).map((p) => (
                  <OptionChip key={p} label={p} selected={form.place.trim().toLowerCase() === p.toLowerCase()} onPress={() => set({ place: p })} />
                ))}
              </View>
            ) : null}
          </View>

          {/* With */}
          {companions.length || invited.length ? (
            <View onLayout={spot('with')} style={styles.section}>
              <Label text="Sat with someone?" />
              <View style={styles.people}>
                {companions.map((m, i) => {
                  const on = form.withIds.includes(m.id);
                  return (
                    <PersonRow
                      key={m.id}
                      first={i === 0}
                      name={m.name}
                      color={m.color}
                      photoUri={typeof m.photoUri === 'string' ? m.photoUri : null}
                      note={breakIds.has(m.id) ? 'On a break' : undefined}
                      picked={on}
                      disabled={!on && full}
                      onPress={() => setForm((f) => toggleCompanion(f, m.id))}
                    />
                  );
                })}
                {invited.map((m, i) => (
                  <PersonRow
                    key={m.id}
                    first={!companions.length && i === 0}
                    name={m.name}
                    color={m.color}
                    note="Hasn’t joined yet"
                    picked={false}
                    disabled
                    onPress={() => undefined}
                  />
                ))}
              </View>
              <Note text={full ? `That’s ${LIMITS.people} of you, the most for one session.` : 'They get a note and can take themselves off it.'} />
            </View>
          ) : null}

          {/* Photo */}
          <View style={styles.section}>
            <Label text="Photo" />
            <PhotoField uri={form.photoUri} onChange={(uri) => set({ photoUri: uri })} />
          </View>

          {/* Note */}
          <View onLayout={spot('note')} style={styles.section}>
            <Field
              label="Note"
              value={form.note}
              onChangeText={(t) => set({ note: t })}
              maxLength={LIMITS.note}
              multiline
              placeholder="How was it?"
              error={errors.note}
              hint={form.note.length >= LIMITS.note - 20 ? `${LIMITS.note - form.note.length} left` : undefined}
              accessibilityLabel={`Note, up to ${LIMITS.note} characters, optional`}
            />
          </View>

          {draft ? (
            <View style={styles.section}>
              <TextAction label="Throw this one away" tone="coal" onPress={discardDraft} />
            </View>
          ) : null}
          </>
          ) : (
            <View style={styles.restSpace} />
          )}
          {wide ? null : saveButton}
        </ScrollView>

        {/* With large text the button scrolls with the form, so the fields keep the room. */}
        {wide ? <View style={[styles.foot, { paddingBottom: insets.bottom + space.s12 }]}>{saveButton}</View> : null}
      </Animated.View>

      <ConfirmDialog
        visible={confirmClose}
        title={params.fromTimer ? 'Throw this session away?' : 'Close without saving?'}
        body={params.fromTimer ? 'The timer’s done, so it won’t be saved anywhere else.' : 'What you’ve put in here won’t be kept.'}
        actions={[
          { label: 'Keep it', kind: 'secondary', dismiss: true, onPress: () => setConfirmClose(false) },
          {
            label: params.fromTimer ? 'Throw it away' : 'Close',
            kind: 'quiet',
            onPress: () => {
              setConfirmClose(false);
              slideAway();
            },
          },
        ]}
      />
    </View>
  );
}

function pairs<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

function Label({ text }: { text: string }) {
  return (
    <Text style={[type.labelStrong, styles.label]} accessibilityRole="header">
      {text}
    </Text>
  );
}

/** A quiet line under a field; coal when it's something to fix. */
function Note({ text, error }: { text: string; error?: boolean }) {
  return <Text style={[type.label, styles.note, error && styles.coal]}>{text}</Text>;
}

/** Someone to add: avatar, name, a note ("On a break"), and a round check that fills ember. */
function PersonRow({
  name,
  color,
  photoUri,
  note,
  picked,
  disabled,
  onPress,
  first,
}: {
  name: string;
  color: string;
  photoUri?: string | null;
  note?: string;
  picked: boolean;
  disabled: boolean;
  onPress: () => void;
  first: boolean;
}) {
  const on = useSharedValue(picked ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(picked ? 1 : 0, timing.utility));
  }, [picked, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: 0.6 + 0.4 * on.value }] }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={note ? `${name}, ${note}` : name}
      accessibilityState={{ checked: picked, disabled }}
      style={({ pressed }) => [styles.person, !first && styles.personLine, pressed && styles.pressed]}
    >
      <View style={disabled && !picked ? styles.dim : undefined}>
        <Avatar name={name} color={color} photoUri={photoUri} size={38} />
      </View>
      <View style={[styles.flex, disabled && !picked ? styles.dim : undefined]}>
        <Text style={type.bodyStrong}>{name}</Text>
        {note ? <Text style={type.label}>{note}</Text> : null}
      </View>
      <View style={[styles.check, disabled && !picked ? styles.dim : undefined]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.checkOn, fill]}>
          <Icon name="check" size={16} color={palette.steam} strokeWidth={2.4} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * The photo: a fixed 4:3 box, so nothing moves when a photo arrives. Empty, it
 * offers the camera and the library; filled, the photo fades in over aspen with
 * "Replace" and "Remove".
 */
function PhotoField({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const loaded = useSharedValue(0);
  const img = useAnimatedStyle(() => ({ opacity: loaded.value }));
  const pick = async (from: PhotoSource) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await pickSessionPhoto(from);
      if (next) {
        loaded.set(0);
        onChange(next);
      }
    } catch {
      haptics.error();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <View style={styles.photo}>
        {uri ? (
          <Animated.View style={[StyleSheet.absoluteFill, img]}>
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoad={() => loaded.set(withTiming(1, timing.utility))}
              accessibilityIgnoresInvertColors
              accessible
              accessibilityRole="image"
              accessibilityLabel="Your photo"
            />
          </Animated.View>
        ) : (
          <View style={styles.photoEmpty}>
            <PhotoButton icon="camera" label="Take a photo" onPress={() => pick('camera')} />
            <View style={styles.photoDivider} />
            <PhotoButton icon="photo" label="Choose one" onPress={() => pick('library')} />
          </View>
        )}
      </View>
      {uri ? (
        <View style={styles.photoActions}>
          <TextAction label="Replace" onPress={() => pick('library')} size="bodySmall" />
          <TextAction label="Remove" onPress={() => onChange(null)} size="bodySmall" tone="coal" />
        </View>
      ) : null}
    </View>
  );
}

function PhotoButton({ icon, label, onPress }: { icon: 'camera' | 'photo'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={28} color={palette.smoke} />
      <Text style={[type.bodySmallStrong, styles.smoke]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: alpha.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderCurve: 'continuous',
    backgroundColor: palette.birch,
    boxShadow: depth.float,
    overflow: 'hidden',
  },
  head: { paddingTop: space.s8, paddingHorizontal: layout.inset, paddingBottom: space.s8 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: radii.round, backgroundColor: palette.grain },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.s12, gap: space.s12 },
  title: { flex: 1 },
  close: {
    width: layout.touch - space.s8,
    height: layout.touch - space.s8,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: layout.inset, paddingTop: space.s8, paddingBottom: space.s40 },
  section: { marginTop: space.s24 },
  row: { flexDirection: 'row', gap: space.s12 },
  stackGap: { marginTop: space.s16 },
  label: { color: palette.smoke, marginBottom: space.s8 },
  note: { marginTop: space.s8 },
  coal: { color: palette.coal },
  smoke: { color: palette.smoke },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s12 },
  grid: { gap: space.s12 },
  gridRow: { flexDirection: 'row', gap: space.s12 },
  gap12: { height: space.s12 },
  gapTop: { marginTop: space.s16 },
  plunge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: layout.rowCompact,
    paddingHorizontal: space.s16,
    borderRadius: radii.field,
    borderCurve: 'continuous',
    backgroundColor: palette.steam,
    boxShadow: depth.card,
  },
  people: { borderRadius: radii.card, borderCurve: 'continuous', backgroundColor: palette.steam, boxShadow: depth.card, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: layout.row, paddingHorizontal: space.s16, paddingVertical: space.s8 },
  personLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha.hairline },
  pressed: { backgroundColor: alpha.press },
  dim: { opacity: 0.45 },
  check: { width: 26, height: 26, borderRadius: radii.round, backgroundColor: palette.aspen, boxShadow: depth.sunk },
  checkOn: { borderRadius: radii.round, backgroundColor: palette.ember, alignItems: 'center', justifyContent: 'center' },
  refusal: {
    flexDirection: 'row',
    gap: space.s12,
    marginTop: space.s16,
    padding: space.s16,
    borderRadius: radii.field,
    borderCurve: 'continuous',
    backgroundColor: palette.steam,
    boxShadow: depth.card,
  },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: radii.tile,
    borderCurve: 'continuous',
    backgroundColor: palette.aspen,
    overflow: 'hidden',
    boxShadow: depth.sunk,
  },
  photoEmpty: { flex: 1, flexDirection: 'row' },
  photoButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s8, padding: space.s16 },
  photoDivider: { width: StyleSheet.hairlineWidth, marginVertical: space.s24, backgroundColor: palette.grain },
  photoActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s8 },
  /** Holds the scroll height the later fields take, so nothing jumps when they arrive. */
  restSpace: { height: 1200 },
  foot: { paddingTop: space.s12, paddingHorizontal: layout.inset, backgroundColor: palette.birch, boxShadow: depth.tabBar },
});
