import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState as RNAppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { FeGaussianBlur, Filter, G, Path, Defs } from 'react-native-svg';
import { RootStackScreenProps } from '../navigation/types';
import { useApp } from '../state/AppState';
import { LIMITS, SAUNA_TYPES, TARGET_CHOICES, saunaTypeLabels } from '../data/saunas';
import { TimerResult, TimerState, announcement, clockLabel, heatMs, isStale, phase } from '../state/timer';
import {
  arcProgress,
  fiveMinuteMark,
  litDots,
  roomHeading,
  roomLine,
  roomSubheading,
  spokenClock,
  warmthStep,
} from '../state/timerRoom';
import { alpha, gradients, layout, palette, radii, space } from '../theme/tokens';
import { moments, springTouchdownMs, timing, useReduceMotion } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';
import { haptics } from '../theme/haptics';
import { Backdrop } from '../components/Backdrop';
import { HeatGlow } from '../components/HeatGlow';
import { SteamWisps } from '../components/SteamWisps';
import { FixedDigits } from '../components/FixedDigits';
import { TimerArc } from '../components/TimerArc';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';
import { OptionChip } from '../components/OptionChip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { useNow } from '../components/useNow';
import { useScreenVisible } from '../components/useScreenVisible';
import { onDevCommand } from '../dev/capture';
import { LogSessionSheet } from './LogSessionScreen';

/**
 * The timer: "the door closes" (design/saunafam-spec.md, section 2, Timer, and
 * Key motion moments 3 and 4; section 3, Timer).
 *
 * Opening: a door grows on the morph spring from the frame it was opened from
 * (the Start button, ember; or Today's timer bar, char) to the whole screen,
 * its face easing from ember to char over 800 ms while the heat glow rises
 * from the floor over 1.4 s. The medium haptic fires when the door lands.
 * The status bar turns light with it.
 *
 * Running: the numerals count heat time only (FixedDigits), the ember arc
 * fills toward the target and stays full past it, the glow breathes and warms
 * one step every 5 minutes, with a light tick and a VoiceOver line at each
 * 5-minute mark. Everything is worked out from the stored timestamps, so
 * backgrounding or killing the app loses nothing.
 *
 * Done: the glow cools toward lake (700 ms), the numerals settle, then the
 * room lightens back to Today as the log sheet rises, filled in.
 *
 * Reduce Motion: no morph or rise; the room crossfades in and out.
 */

type Stage = 'open' | 'finishing' | 'sheet' | 'leaving';
type Dialog = null | 'cancel' | 'stale';

/** Timers that already said "Keep going" to the 3-hour prompt, by start. */
const keptGoing = new Set<string>();

export function TimerScreen({ navigation, route }: RootStackScreenProps<'Timer'>) {
  const app = useApp();
  const live = app.view?.timer ?? null;
  const { width: W, height: H, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const visible = useScreenVisible();
  const origin = route.params?.origin;
  const started = !!route.params?.started;

  const [stage, setStage] = useState<Stage>('open');
  const [landed, setLanded] = useState(false);
  const [lightened, setLightened] = useState(false);
  const [frozen, setFrozen] = useState<{ timer: TimerState; at: Date } | null>(null);
  const [result, setResult] = useState<{ prefill: TimerResult; askTime: boolean } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [panel, setPanel] = useState(false);
  const [burst, setBurst] = useState(0);

  const ticking = stage === 'open' && visible && !!live;
  const now = useNow(ticking);
  const timer = frozen?.timer ?? live;
  const at = frozen?.at ?? now;

  // Coming back to an old timer: "Still going? It's been 3 hours".
  const checkStale = useCallback(() => {
    const t = app.view?.timer;
    if (t && isStale(t, new Date()) && !keptGoing.has(t.startedAt)) setDialog('stale');
  }, [app.view?.timer]);
  const checkStaleRef = useRef(checkStale);
  useEffect(() => {
    checkStaleRef.current = checkStale;
  });

  // ─── The door ──────────────────────────────────────────────────────────────

  const morph = !!origin && reduceMotion === false;
  const fromEmber = origin?.tone === 'ember';
  const doorX = useSharedValue(morph && origin ? origin.x : 0);
  const doorY = useSharedValue(morph && origin ? origin.y : 0);
  const doorW = useSharedValue(morph && origin ? origin.width : W);
  const doorH = useSharedValue(morph && origin ? origin.height : H);
  const doorR = useSharedValue(morph && origin ? origin.radius : 0);
  const ember = useSharedValue(morph && fromEmber ? 1 : 0);
  const room = useSharedValue(morph ? 1 : 0);
  const face = useSharedValue(morph ? 0 : 0);
  const settle = useSharedValue(0);

  // The door waits for Reduce Motion's answer, so it never flashes the wrong way.
  const opened = useRef(false);
  useEffect(() => {
    if (reduceMotion === null || opened.current) return;
    opened.current = true;
    const land = () => {
      setLanded(true);
      if (started) haptics.timerStart();
      checkStaleRef.current();
    };
    if (!morph) {
      room.set(withTiming(1, timing.utility));
      face.set(withTiming(1, timing.utility));
      const t = setTimeout(land, timing.utility.duration);
      return () => clearTimeout(t);
    }
    const spring = moments.doorCloses.morph;
    // An overdamped spring stops a hair short of its target; once it rests,
    // the door snaps to the exact frame so no sliver of Today shows at an edge.
    const exact = (v: typeof doorX, to: number) => (done?: boolean) => {
      'worklet';
      if (done) v.set(to);
    };
    doorX.set(withSpring(0, spring, exact(doorX, 0)));
    doorY.set(withSpring(0, spring, exact(doorY, 0)));
    doorW.set(withSpring(W, spring, exact(doorW, W)));
    doorH.set(withSpring(H, spring, exact(doorH, H)));
    doorR.set(withSpring(0, spring, exact(doorR, 0)));
    ember.set(withTiming(0, moments.doorCloses.room));
    // The room's contents settle in once the door is most of the way open.
    face.set(withDelay(springTouchdownMs(spring) / 2, withTiming(1, timing.settle)));
    const t = setTimeout(land, springTouchdownMs(spring));
    return () => clearTimeout(t);
    // Opens once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const doorStyle = useAnimatedStyle(() => ({
    left: doorX.value,
    top: doorY.value,
    width: doorW.value,
    height: doorH.value,
    borderRadius: doorR.value,
    opacity: room.value,
  }));
  // The room inside the door stays put on screen while the door opens over it.
  const insideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -doorX.value }, { translateY: -doorY.value }] }));
  const emberStyle = useAnimatedStyle(() => ({ opacity: ember.value }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, ember.value * 3 - 2) }));
  const faceStyle = useAnimatedStyle(() => ({ opacity: face.value * room.value }));
  const settleStyle = useAnimatedStyle(() => ({ opacity: 1 - settle.value }));
  const numeralStyle = useAnimatedStyle(() => ({
    opacity: room.value,
    transform: [{ scale: 1 - 0.03 * settle.value }],
  }));

  // ─── Leaving ───────────────────────────────────────────────────────────────

  const close = useCallback(() => navigation.goBack(), [navigation]);

  /** Fade the room away and go back to Today. The timer keeps running unless it was ended. */
  const leave = useCallback(() => {
    setStage('leaving');
    setLightened(true);
    room.set(
      withTiming(0, reduceMotion === false ? moments.finishCool.room : timing.utility, (done) => {
        if (done) scheduleOnRN(close);
      }),
    );
  }, [close, reduceMotion, room]);

  // Someone ended the timer elsewhere (signed out, a second device): leave quietly.
  useEffect(() => {
    if (live || frozen || stage !== 'open' || !landed) return;
    const id = requestAnimationFrame(leave);
    return () => cancelAnimationFrame(id);
  }, [live, frozen, stage, landed, leave]);

  // ─── Finishing ─────────────────────────────────────────────────────────────

  const finish = useCallback(
    async (askTime: boolean) => {
      if (!live || stage !== 'open') return;
      const at = new Date();
      setFrozen({ timer: live, at });
      setDialog(null);
      setPanel(false);
      setStage('finishing');
      const prefill = await app.finishTimer();
      if (!prefill) return;
      const cool = reduceMotion === false ? moments.finishCool.glow : timing.utility;
      settle.set(withTiming(1, cool));
      // The success haptic lands with the cooled glow, then the room lightens as the sheet rises.
      setTimeout(() => {
        haptics.finish();
        setResult({ prefill, askTime });
        setStage('sheet');
        room.set(withTiming(0, reduceMotion === false ? moments.finishCool.room : timing.utility));
        setTimeout(() => setLightened(true), moments.finishCool.room.duration / 3);
      }, cool.duration);
    },
    [app, live, reduceMotion, room, settle, stage],
  );

  // ─── The clock, the ticks and the voice ───────────────────────────────────

  const mark = timer ? fiveMinuteMark(timer, at) : 0;
  const lastMark = useRef(mark);
  useEffect(() => {
    if (!timer || stage !== 'open') return;
    // One mark up while you watch: tick. A jump (back from the background) just catches up.
    if (mark === lastMark.current + 1 && visible) {
      haptics.fiveMinuteTick();
      const line = announcement(timer, at, (mark - 1) * 5);
      if (line) AccessibilityInfo.announceForAccessibility(line);
    }
    lastMark.current = mark;
  }, [mark, timer, at, stage, visible]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') checkStale();
    });
    return () => sub.remove();
  }, [checkStale]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const cooling = !!timer && phase(timer) === 'cooling';
  const throwLoyly = () => {
    setBurst((b) => b + 1);
    // The water hits the stones on the tap: the burst starts on the same frame.
    haptics.loyly();
  };
  const round = () => (cooling ? app.resumeTimer() : app.coolOff());
  const cancelSession = async () => {
    setDialog(null);
    await app.discardTimer();
    leave();
  };

  useEffect(
    () =>
      onDevCommand((cmd) => {
        if (cmd === 'loyly') throwLoyly();
        else if (cmd === 'round') round();
        else if (cmd === 'done') finish(false);
        else if (cmd === 'cancel') setDialog('cancel');
        else if (cmd === 'stale') setDialog('stale');
        else if (cmd === 'panel') setPanel(true);
        else if (cmd === 'hide') leave();
      }),
    // Dev captures only; the latest handlers each time.
  );

  // ─── Drawing ───────────────────────────────────────────────────────────────

  const heat = timer ? heatMs(timer, at) : 0;
  const clock = clockLabel(heat);
  const big = fontScale > 1.35;
  const roundsLeft = !!timer && timer.rounds.length < LIMITS.rounds.max;

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar style={landed && !lightened ? 'light' : 'dark'} animated />

      <Animated.View style={[styles.door, doorStyle]} pointerEvents="none">
        <Animated.View style={[{ width: W, height: H }, insideStyle]}>
          <View style={[StyleSheet.absoluteFill, styles.char]} />
          <Backdrop tone="dark" seed={3} />
          <HeatGlow
            rise={reduceMotion === false}
            warmth={timer && !cooling ? warmthStep(timer, at) : 0}
            cooled={cooling || stage !== 'open'}
            breathe={stage === 'open' && !cooling}
            width={W}
            height={H}
          />
          <RoomSteam width={W} height={H} />
          <SteamWisps width={W} height={H} tone="dark" columns={[]} burstKey={burst} />
        </Animated.View>
        {origin && fromEmber ? (
          <Animated.View style={[StyleSheet.absoluteFill, emberStyle]}>
            <LinearGradient
              colors={[gradients.emberButton[0].color, gradients.emberButton[1].color, gradients.emberButton[2].color]}
              locations={[gradients.emberButton[0].offset, gradients.emberButton[1].offset, gradients.emberButton[2].offset]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.doorLabel, { height: origin.height }, labelStyle]}>
              <Icon name="timer" size={22} color={palette.steam} />
              <Text style={[type.bodyStrong, styles.steam]}>Start a session</Text>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>

      {timer ? (
        <Animated.View
          style={[styles.face, { paddingTop: insets.top - space.s8, paddingBottom: insets.bottom + space.s8 }, faceStyle]}
          pointerEvents={stage === 'open' && landed ? 'box-none' : 'none'}
        >
          <Animated.View style={[styles.top, settleStyle]}>
            <Pressable
              onPress={leave}
              hitSlop={space.s8}
              style={styles.hide}
              accessibilityRole="button"
              accessibilityLabel="Back to Today"
              accessibilityHint="The timer keeps running"
            >
              <HideMark />
            </Pressable>
            <Text style={[type.caption, styles.caps]} maxFontSizeMultiplier={maxFontScale.caption} accessibilityRole="header">
              {roomHeading(timer)}
            </Text>
            <View style={styles.hide} />
          </Animated.View>

          <ClockFace
            timer={timer}
            at={at}
            clock={clock}
            cooling={cooling}
            settleStyle={settleStyle}
            numeralStyle={numeralStyle}
            onTarget={() => setPanel(true)}
            width={W}
          />

          <Animated.View style={settleStyle}>
            <Text style={[type.bodySmall, styles.line]}>{roomLine(timer, at)}</Text>
            <View style={styles.loylyWrap}>
              <View style={styles.loyly}>
                <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                <SolidButton
                  tone="ash"
                  title="Throw löyly"
                  accessibilityHint="A burst of steam. Nothing is saved."
                  icon={<Icon name="ladle" size={24} color={palette.steam} />}
                  onPress={throwLoyly}
                />
              </View>
            </View>
          </Animated.View>

          <View style={[styles.gap, { height: H * 0.145 }]} />

          <Animated.View style={[big ? styles.actionsStacked : styles.actions, settleStyle]}>
            {big ? (
              <>
                <TextAction label="Done" tone="steam" onPress={() => finish(false)} />
                <TextAction label={cooling ? 'Back in the heat' : 'Add a round'} tone="steam" onPress={round} disabled={!cooling && !roundsLeft} />
                <TextAction label="Cancel" tone="steamDim" onPress={() => setDialog('cancel')} />
              </>
            ) : (
              <>
                <TextAction label="Cancel" tone="steamDim" onPress={() => setDialog('cancel')} style={styles.actionLeft} />
                <TextAction
                  label={cooling ? 'Back in the heat' : 'Add a round'}
                  tone="steam"
                  onPress={round}
                  disabled={!cooling && !roundsLeft}
                  accessibilityHint={cooling ? 'Starts the next round' : 'Pauses the heat clock while you cool off'}
                  style={styles.actionMid}
                />
                <TextAction label="Done" tone="steam" onPress={() => finish(false)} accessibilityHint="Opens the log form, filled in" style={styles.actionRight} />
              </>
            )}
          </Animated.View>
        </Animated.View>
      ) : null}

      {timer ? (
        <TargetPanel
          visible={panel}
          timer={timer}
          onClose={() => setPanel(false)}
          onTarget={(m) => app.setTimerTarget(m)}
          onType={(t) => app.setTimerSaunaType(t)}
          bottomInset={insets.bottom}
        />
      ) : null}

      <ConfirmDialog
        tone="dark"
        visible={dialog === 'cancel'}
        title="Cancel this session?"
        body="The timer stops and nothing’s saved."
        actions={[
          { label: 'Keep going', kind: 'secondary', onPress: () => setDialog(null), dismiss: true },
          { label: 'Cancel session', kind: 'quiet', onPress: cancelSession },
        ]}
      />
      <ConfirmDialog
        tone="dark"
        visible={dialog === 'stale'}
        title="Still going? It’s been 3 hours"
        body="Log it with your real time, keep the timer going, or let it go."
        actions={[
          { label: 'Log it', kind: 'primary', onPress: () => finish(true) },
          {
            label: 'Keep going',
            kind: 'secondary',
            dismiss: true,
            onPress: () => {
              if (live) keptGoing.add(live.startedAt);
              setDialog(null);
            },
          },
          { label: 'Discard', kind: 'quiet', onPress: cancelSession },
        ]}
      />

      {result ? (
        <LogSessionSheet
          params={{ fromTimer: true, prefill: result.prefill, askTime: result.askTime }}
          onClosed={close}
        />
      ) : null}
    </View>
  );
}

/** The arc, the numerals and the type and target line, centered in the space between the top line and the bottom. */
function ClockFace({
  timer,
  at,
  clock,
  cooling,
  settleStyle,
  numeralStyle,
  onTarget,
  width,
}: {
  timer: TimerState;
  at: Date;
  clock: string;
  cooling: boolean;
  settleStyle: ReturnType<typeof useAnimatedStyle>;
  numeralStyle: ReturnType<typeof useAnimatedStyle>;
  onTarget: () => void;
  width: number;
}) {
  const [box, setBox] = useState({ w: width, h: 0 });
  // The mockup's ring is 0.4 of the screen's width; it shrinks only when the space does (large text).
  const radius = Math.min(width * 0.4, box.h / 2 - space.s16);
  const showArc = radius >= width * 0.3;
  const heat = heatMs(timer, at);
  return (
    <View style={styles.clockFace} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.h > 0 && showArc ? (
        <Animated.View style={[styles.arc, settleStyle]}>
          <TimerArc radius={radius} lit={litDots(arcProgress(timer, at))} dim={cooling} />
        </Animated.View>
      ) : null}
      {/* The ring centers on the figures, not on the figures and the line under them (the mockup). */}
      <Animated.View style={[styles.numerals, numeralStyle, cooling && styles.numeralsCooling]}>
        <FixedDigits
          value={clock}
          accessibilityLabel={`${spokenClock(heat)} in the heat${cooling ? ', paused while you cool off' : ''}`}
        />
      </Animated.View>
      <Animated.View style={settleStyle}>
        <Pressable
          onPress={onTarget}
          hitSlop={space.s12}
          style={styles.sub}
          accessibilityRole="button"
          accessibilityLabel={`${roomSubheading(timer)}. Change the target or sauna type`}
        >
          <Text style={[type.caption, styles.subText]} maxFontSizeMultiplier={maxFontScale.caption}>
            {roomSubheading(timer)}
          </Text>
          <Icon name="pencil" size={13} color={alpha.steam62} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** The "back to Today" mark: a short bar that reads as "lower this". Drawn, not a glyph. */
function HideMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={alpha.steam60} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9.5l5.5 5.5 5.5-5.5" />
    </Svg>
  );
}

/**
 * The mockup's three slow steam paths rising from the floor, blurred (SVG
 * Gaussian blur), drawn once. Scaled from the 440 x 956 mockup.
 */
const RoomSteam = memo(function RoomSteam({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Filter id="roomSteamBlur" x="-50%" y="-20%" width="200%" height="140%">
          <FeGaussianBlur stdDeviation={6} />
        </Filter>
      </Defs>
      <G filter="url(#roomSteamBlur)" stroke={palette.steam} strokeLinecap="round" fill="none">
        <G transform={`scale(${width / 440} ${height / 956})`}>
          <Path d="M150 956c-18-60 26-92 6-150s-30-80-6-130" strokeWidth={7} strokeOpacity={0.07} />
          <Path d="M292 956c20-50-22-86-2-136s28-70 8-118" strokeWidth={9} strokeOpacity={0.06} />
          <Path d="M222 956c-12-40 18-70 4-110" strokeWidth={5} strokeOpacity={0.08} />
        </G>
      </G>
    </Svg>
  );
});

/** Change the target (10, 15, 20, 30) and the sauna type with one tap each, in the room. */
function TargetPanel({
  visible,
  timer,
  onClose,
  onTarget,
  onType,
  bottomInset,
}: {
  visible: boolean;
  timer: TimerState;
  onClose: () => void;
  onTarget: (minutes: number) => void;
  onType: (t: TimerState['saunaType']) => void;
  bottomInset: number;
}) {
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const shown = useSharedValue(0);
  const { rise, ...curve } = moments.roomPanel;
  useEffect(() => {
    if (!mounted) return;
    shown.set(
      withTiming(visible ? 1 : 0, visible && reduceMotion === false ? curve : timing.utility, (done) => {
        if (done && !visible) scheduleOnRN(setMounted, false);
      }),
    );
    // curve is a constant from motion.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, reduceMotion, shown]);
  const scrim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const card = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: reduceMotion === false ? (1 - shown.value) * rise : 0 }],
  }));
  if (!mounted) return null;
  const pick = (fn: () => void) => () => {
    fn();
  };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.panelScrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} importantForAccessibility="no" accessibilityElementsHidden />
      </Animated.View>
      <Animated.View style={[styles.panel, { paddingBottom: bottomInset + space.s16 }, card]} accessibilityViewIsModal>
        <Text style={[type.caption, styles.caps]} maxFontSizeMultiplier={maxFontScale.caption} accessibilityRole="header">
          Target
        </Text>
        <View style={styles.chips}>
          {TARGET_CHOICES.map((m) => (
            <OptionChip
              key={m}
              tone="dark"
              label={`${m} min`}
              accessibilityLabel={`${m} minutes`}
              selected={timer.targetMinutes === m}
              onPress={pick(() => onTarget(m))}
            />
          ))}
        </View>
        <Text style={[type.caption, styles.caps, styles.panelGap]} maxFontSizeMultiplier={maxFontScale.caption} accessibilityRole="header">
          Sauna
        </Text>
        <View style={styles.chips}>
          {SAUNA_TYPES.map((t) => (
            <OptionChip key={t} tone="dark" label={saunaTypeLabels[t]} selected={timer.saunaType === t} onPress={pick(() => onType(t))} />
          ))}
        </View>
        <View style={styles.panelDone}>
          <TextAction label="Done" tone="steam" onPress={onClose} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  door: { position: 'absolute', overflow: 'hidden', borderCurve: 'continuous' },
  char: { backgroundColor: palette.char },
  doorLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s12,
  },
  steam: { color: palette.steam },
  face: { ...StyleSheet.absoluteFill },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s16, minHeight: layout.touch },
  hide: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  caps: { flex: 1, textAlign: 'center', color: alpha.steam62 },
  clockFace: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: space.s16 },
  arc: { position: 'absolute' },
  numerals: { alignItems: 'center', marginTop: space.s40 },
  numeralsCooling: { opacity: 0.72 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingVertical: space.s4, marginTop: space.s8 },
  subText: { color: alpha.steam62 },
  line: { color: alpha.steam72, textAlign: 'center', paddingHorizontal: layout.inset },
  loylyWrap: { alignItems: 'center', marginTop: space.s32 },
  loyly: { width: '47%', borderRadius: radii.button, borderCurve: 'continuous', overflow: 'hidden' },
  gap: { flexShrink: 1, minHeight: space.s24 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.inset },
  actionLeft: { flex: 1, alignItems: 'flex-start' },
  actionMid: { flex: 1.4, alignItems: 'center' },
  actionRight: { flex: 1, alignItems: 'flex-end' },
  actionsStacked: { alignItems: 'center', gap: space.s4 },
  panelScrim: { backgroundColor: alpha.roomScrim },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.s24,
    paddingHorizontal: layout.inset,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderCurve: 'continuous',
    backgroundColor: alpha.roomPanel,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s12 },
  panelGap: { marginTop: space.s24 },
  panelDone: { marginTop: space.s16, alignItems: 'center' },
});
