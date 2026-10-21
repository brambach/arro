import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../navigation/types';
import type { PlusFocus } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import type { WallWood } from '../data/types';
import {
  FINISHING_SLOW_MS,
  PLUS_COPY,
  PlusPhase,
  PlusPick,
  SheetState,
  lapsedLine,
  phaseAfterBuy,
  phaseAfterOffering,
  phaseAfterRestore,
  phaseWithServer,
  renewalLine,
  sheetState,
} from '../state/plusFlow';
import type { PackageId, PlusOffering } from '../state/purchases';
import { PREVIEW_LABEL } from '../state/purchases';
import { alpha, layout, palette, radii, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { timing } from '../theme/motion';
import { haptics } from '../theme/haptics';
import { Card } from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { RouteSheet, RouteSheetHandle } from '../components/RouteSheet';
import { Bone } from '../components/Skeleton';
import { Slat } from '../components/Slat';
import { SlatWall } from '../components/SlatWall';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';
import { wallWeeks } from '../components/WallCard';
import { devDriverOn } from '../dev/DevDriver';
import { LINKS } from './SettingsScreen';
import { WOOD_NAMES } from './WallScreen';

/** Apple's standard license agreement: the Terms of Use (App Review Guideline 3.1.2). */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** Apple's subscriptions screen, where Manage goes. */
export const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

const WOODS: WallWood[] = ['birch', 'cedar', 'alder', 'charred_pine'];

type FeatureKey = keyof typeof PLUS_COPY.features;
const FEATURES: { key: FeatureKey; icon: IconName; focus: PlusFocus }[] = [
  { key: 'woods', icon: 'slat', focus: 'woods' },
  { key: 'timerFace', icon: 'timer', focus: 'timerFace' },
  { key: 'appIcon', icon: 'stone', focus: 'appIcon' },
  { key: 'everyWeek', icon: 'calendar', focus: 'everyWeek' },
  { key: 'heatLog', icon: 'thermometer', focus: 'heatLog' },
  { key: 'poster', icon: 'poster', focus: 'poster' },
];

/**
 * The Plus sheet (spec, Paid tier): birch, 90% of the screen, the close mark
 * top right at full size from the first frame. At the top, the family's real
 * wall in the wood picked (tap a wood to see it); then what Plus is, the two
 * prices from the offering as flat tiles, one ember button, "Not now" as plain
 * text, the small print with Restore purchases, Terms and Privacy, Bryce's
 * sign-off, and the tip jar.
 *
 * The block in the middle follows sheetState (src/state/plusFlow.ts): every
 * one of the 16 states. Whether the family has Plus always comes from the
 * server (view.plus); a purchase only shows "Finishing up..." until it agrees.
 * Nothing here exists while plus_enabled is false: the sheet closes itself.
 */
export function PlusSheetScreen({ navigation, route }: RootStackScreenProps<'Plus'>) {
  const view = useView();
  const app = useApp();
  const { height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheet = useRef<RouteSheetHandle>(null);
  const scroll = useRef<ScrollView>(null);
  const focus = route.params?.focus;

  const [offering, setOffering] = useState<PlusOffering | null>(null);
  const [rawPhase, setPhase] = useState<PlusPhase>({ kind: 'loading' });
  const [pick, setPick] = useState<PlusPick>('annual');
  const [wood, setWood] = useState<WallWood>(route.params?.wood ?? (view.plus.active ? view.plus.wood : 'cedar'));
  const [tipLine, setTipLine] = useState<string | null>(null);
  const [tipBusy, setTipBusy] = useState<PackageId | null>(null);
  const [tipsY, setTipsY] = useState<number | null>(null);
  const lastBuy = useRef<PackageId>('annual');

  const plus = view.plus;
  const close = useCallback(() => sheet.current?.close(), []);

  // Plus switched off: nothing about it may show, so the sheet goes straight away.
  useEffect(() => {
    if (!plus.visible) navigation.goBack();
  }, [plus.visible, navigation]);

  const [offerAttempt, setOfferAttempt] = useState(0);
  const { loadOffering } = app;
  useEffect(() => {
    let alive = true;
    loadOffering()
      .catch(() => null)
      .then((o) => {
        if (!alive) return;
        setOffering(o);
        setPhase(phaseAfterOffering(o));
      });
    return () => {
      alive = false;
    };
  }, [loadOffering, offerAttempt]);
  const load = useCallback(() => {
    setPhase({ kind: 'loading' });
    setOfferAttempt((n) => n + 1);
  }, []);

  // The server agrees: "Finishing up..." becomes thanks, and the wall re-grains once.
  const phase = phaseWithServer(rawPhase, plus);
  const grain = phase.kind === 'success' ? 1 : 0;

  // "Keep this wood (face, icon) with Plus": once Plus lands, keep what was being tried on.
  const landed = phase.kind === 'success';
  const { setWallWood, setLook } = app;
  const kept = useRef(false);
  useEffect(() => {
    if (!landed || kept.current) return;
    kept.current = true;
    const p = route.params;
    if (p?.wood && p.wood !== 'birch') setWallWood(p.wood).catch(() => undefined);
    if (p?.face) setLook({ timerFace: p.face });
    if (p?.icon) setLook({ appIcon: p.icon });
  }, [landed, route.params, setWallWood, setLook]);

  // While finishing: ask again every few seconds, and after a while say it can be closed.
  const finishing = phase.kind === 'finishing';
  const { refresh } = app;
  useEffect(() => {
    if (!finishing) return;
    const poll = setInterval(() => void refresh(), 4000);
    const slow = setTimeout(() => setPhase((p) => (p.kind === 'finishing' ? { ...p, slow: true } : p)), FINISHING_SLOW_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(slow);
    };
  }, [finishing, refresh]);

  const buy = useCallback(
    async (pkg: 'annual' | 'lifetime') => {
      lastBuy.current = pkg;
      const hadYearly = plus.active && plus.payerIsMe && plus.product === 'saunafam.plus.annual';
      setPhase({ kind: 'purchasing', pick: pkg });
      const outcome = await app.buyPlus(pkg);
      if (outcome.status === 'failed' || outcome.status === 'offline') haptics.error();
      setPhase(phaseAfterBuy(outcome, hadYearly));
    },
    [app, plus],
  );

  const restore = useCallback(async () => {
    setPhase({ kind: 'restoring' });
    setPhase(phaseAfterRestore(await app.restorePurchases()));
  }, [app]);

  const tip = useCallback(
    async (pkg: PackageId) => {
      setTipLine(null);
      setTipBusy(pkg);
      const outcome = await app.buyPlus(pkg);
      setTipBusy(null);
      if (outcome.status === 'purchased') {
        haptics.plusLanded();
        setTipLine(PLUS_COPY.tipThanks);
      } else if (outcome.status === 'pending') setTipLine(PLUS_COPY.pendingTitle);
      else if (outcome.status !== 'cancelled') setTipLine(PLUS_COPY.tipFailed);
    },
    [app],
  );

  // Dev builds with the capture driver: press things without taps.
  useEffect(() => {
    if (!devDriverOn) return;
    const subs = [
      DeviceEventEmitter.addListener('plusPick', (p: PlusPick) => setPick(p)),
      DeviceEventEmitter.addListener('plusBuy', () => void buy(pick)),
      DeviceEventEmitter.addListener('plusRestore', () => void restore()),
      DeviceEventEmitter.addListener('plusTip', () => void tip('tip_medium')),
      DeviceEventEmitter.addListener('plusWood', (w: WallWood) => setWood(w)),
      DeviceEventEmitter.addListener('plusScroll', (y: number) => scroll.current?.scrollTo({ y, animated: true })),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [buy, restore, tip, pick]);

  // Opened at the tip jar: scroll it into view once it's laid out.
  useEffect(() => {
    if (focus === 'tips' && tipsY !== null) scroll.current?.scrollTo({ y: tipsY - space.s16, animated: false });
  }, [focus, tipsY]);

  const state = sheetState(phase, plus, pick);
  const weeks = useMemo(() => wallWeeks(view.week.wall.slats.slice(-8), { filled: view.today.you.countedDays, count: view.today.you.goal }), [view]);
  const shownWood: WallWood = plus.active && phase.kind !== 'success' && wood === plus.wood ? plus.wood : wood;

  return (
    <RouteSheet ref={sheet} onClosed={() => navigation.goBack()} accessibilityLabel={PLUS_COPY.title} height={Math.round(H * 0.9)}
      header={
        app.purchasesKind === 'preview' ? (
          <View style={styles.previewTag} accessibilityRole="text">
            <Text style={[type.caption, styles.previewText]}>{PREVIEW_LABEL}</Text>
          </View>
        ) : null
      }
    >
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.s40 }]}
      >
        {/* The family's own wall, in the wood picked. */}
        <Card padding={space.s20} style={styles.wallCard}>
          <View style={styles.wallRow}>
            <View style={styles.wall} accessible accessibilityLabel={`Your wall in ${WOOD_NAMES[shownWood].toLowerCase()}`}>
              <SlatWall weeks={weeks} wood={shownWood} slatHeight={14} grain={grain} onRegrained={haptics.plusLanded} />
            </View>
            <View style={styles.woods}>
              <Text style={type.caption}>{WOOD_NAMES[shownWood]}</Text>
              <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Wall wood">
                {WOODS.map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => setWood(w)}
                    style={[styles.swatch, w === shownWood && styles.swatchOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: w === shownWood }}
                    accessibilityLabel={WOOD_NAMES[w]}
                    hitSlop={space.s4}
                  >
                    <Slat state="kept" wood={w} height={14} seed={2} />
                    <Slat state="open" wood={w} height={14} seed={6} style={styles.swatchGap} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Card>

        <Text style={[type.title, styles.title]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
          {PLUS_COPY.title}
        </Text>
        <Text style={[type.body, styles.lead]}>{PLUS_COPY.lead}</Text>
        <Text style={[type.bodySmall, styles.covers]}>{PLUS_COPY.covers(view.familyName)}</Text>

        <Card padding={0} style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={f.key} style={[styles.feature, i > 0 && styles.featureRule, focus === f.focus && styles.featureFocus]}>
              <View style={styles.mark}>
                <Icon name={f.icon} size={20} color={focus === f.focus ? palette.coal : palette.smoke} />
              </View>
              <View style={styles.featureText}>
                <Text style={type.bodyStrong}>{PLUS_COPY.features[f.key].title}</Text>
                {/* Opened from one of them: that one says a little more. */}
                {focus === f.focus ? <Text style={type.label}>{PLUS_COPY.features[f.key].body}</Text> : null}
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.block}>
          <StateBlock
            state={state}
            phase={phase}
            offering={offering}
            pick={pick}
            onPick={setPick}
            onBuy={() => void buy(pick)}
            onRetry={() => void (state === 'unavailable' ? load() : buy(lastBuy.current === 'lifetime' ? 'lifetime' : pick))}
            onMakeFounding={() => void buy('lifetime')}
            onClose={close}
            familyName={view.familyName}
          />
        </View>

        <View style={styles.links}>
          <TextAction
            label={state === 'restoring' ? PLUS_COPY.restoring : PLUS_COPY.restore}
            onPress={() => void restore()}
            disabled={state === 'restoring' || state === 'purchasing'}
            size="bodySmall"
          />
          <TextAction label={PLUS_COPY.terms} onPress={() => void Linking.openURL(TERMS_URL).catch(() => undefined)} size="bodySmall" />
          <TextAction label={PLUS_COPY.privacy} onPress={() => void Linking.openURL(LINKS.privacy).catch(() => undefined)} size="bodySmall" />
        </View>
        {phase.kind === 'ready' && phase.note === 'restoreOffline' ? <Text style={[type.bodySmall, styles.note]}>{PLUS_COPY.restoreOffline}</Text> : null}
        {phase.kind === 'ready' && phase.note === 'restored' ? <Text style={[type.bodySmall, styles.note]}>{PLUS_COPY.restored(view.familyName)}</Text> : null}

        <Text style={[type.bodySmall, styles.signOff]}>{PLUS_COPY.signOff}</Text>

        <View onLayout={(e) => setTipsY(e.nativeEvent.layout.y)}>
          <Text style={[type.caption, styles.tipsLabel]} accessibilityRole="header">
            {PLUS_COPY.tipsTitle}
          </Text>
          <Text style={[type.bodySmall, styles.tipsBody]}>{PLUS_COPY.tipsBody}</Text>
          <Card padding={0}>
            {offering && offering.tips.length ? (
              offering.tips.map((t, i) => (
                <View key={t.id} style={[styles.tip, i > 0 && styles.featureRule]}>
                  <View style={styles.mark}>
                    <Icon name="ladle" size={20} color={palette.smoke} />
                  </View>
                  <Text style={[type.body, styles.tipName]}>{PLUS_COPY.tips[t.id as 'tip_small' | 'tip_medium' | 'tip_large']}</Text>
                  <PriceChip label={tipBusy === t.id ? '...' : t.priceString} onPress={() => void tip(t.id)} disabled={!!tipBusy} accessibilityLabel={`Tip ${PLUS_COPY.tips[t.id as 'tip_small' | 'tip_medium' | 'tip_large'].toLowerCase()}, ${t.priceString}`} />
                </View>
              ))
            ) : (
              <View style={styles.tipSkeleton}>
                {phase.kind === 'loading' ? (
                  [0, 1, 2].map((i) => <Bone key={i} width="100%" height={40} />)
                ) : (
                  <Text style={type.bodySmall}>{PLUS_COPY.unavailable}</Text>
                )}
              </View>
            )}
          </Card>
          {tipLine ? <Text style={[type.bodySmall, styles.note]}>{tipLine}</Text> : null}
        </View>
      </ScrollView>
    </RouteSheet>
  );
}

/** The part of the sheet that changes with the state. */
function StateBlock({
  state,
  phase,
  offering,
  pick,
  onPick,
  onBuy,
  onRetry,
  onMakeFounding,
  onClose,
  familyName,
}: {
  state: SheetState;
  phase: PlusPhase;
  offering: PlusOffering | null;
  pick: PlusPick;
  onPick: (p: PlusPick) => void;
  onBuy: () => void;
  onRetry: () => void;
  onMakeFounding: () => void;
  onClose: () => void;
  familyName: string;
}) {
  const view = useView();
  const plus = view.plus;
  const price = (p: PlusPick) => (p === 'annual' ? offering?.annual?.priceString : offering?.lifetime?.priceString) ?? '';

  switch (state) {
    case 'loading':
      return (
        <View accessible accessibilityLabel="Loading prices">
          <View style={styles.tiles}>
            <Bone width="48%" height={88} radius={radii.tile} />
            <Bone width="48%" height={88} radius={radii.tile} />
          </View>
          <Bone width="100%" height={layout.button} radius={radii.button} style={styles.gap16} />
        </View>
      );
    case 'unavailable':
      return (
        <Tray>
          <Text style={type.heading}>{PLUS_COPY.unavailable}</Text>
          <Text style={[type.bodySmall, styles.gap8]}>{PLUS_COPY.unavailableBody}</Text>
          <SolidButton title={PLUS_COPY.tryAgain} onPress={onRetry} style={styles.gap16} />
        </Tray>
      );
    case 'pending':
      return (
        <Tray>
          <Text style={type.heading}>{PLUS_COPY.pendingTitle}</Text>
          <Text style={[type.bodySmall, styles.gap8]}>{PLUS_COPY.pendingBody}</Text>
          <SolidButton title={PLUS_COPY.done} onPress={onClose} style={styles.gap16} />
        </Tray>
      );
    case 'success':
      return (
        <Arrive>
          <Text style={[type.heading, styles.center]} accessibilityRole="header" accessibilityLiveRegion="polite">
            {PLUS_COPY.success}
          </Text>
          <Text style={[type.bodySmall, styles.center, styles.gap8]}>{PLUS_COPY.successBody(familyName)}</Text>
          {phase.kind === 'success' && phase.replacedYearly ? <Text style={[type.bodySmall, styles.center, styles.gap8]}>{PLUS_COPY.replacedYearly}</Text> : null}
          <SolidButton title={PLUS_COPY.done} onPress={onClose} style={styles.gap24} />
        </Arrive>
      );
    case 'alreadyHad':
      return (
        <Tray>
          <Text style={type.body}>{PLUS_COPY.alreadyHad}</Text>
          <SolidButton title={PLUS_COPY.done} onPress={onClose} style={styles.gap16} />
        </Tray>
      );
    case 'ownedByMe': {
      const founding = plus.product === 'saunafam.plus.lifetime';
      const renew = renewalLine(plus);
      return (
        <Tray>
          <Text style={type.body}>{founding ? PLUS_COPY.ownedByMeFounding(familyName) : PLUS_COPY.ownedByMe(familyName)}</Text>
          {renew ? <Text style={[type.bodySmall, styles.gap8]}>{renew}</Text> : null}
          {founding ? null : (
            <>
              <SolidButton title={PLUS_COPY.manage} onPress={() => void Linking.openURL(MANAGE_URL).catch(() => undefined)} style={styles.gap16} />
              {offering?.lifetime ? (
                <TextAction label={PLUS_COPY.makeFounding(offering.lifetime.priceString)} onPress={onMakeFounding} size="bodySmall" style={styles.gap12} />
              ) : null}
            </>
          )}
        </Tray>
      );
    }
    case 'ownedByOther':
      return (
        <Tray>
          <Text style={type.body}>{plus.payerName ? PLUS_COPY.ownedByOther(plus.payerName) : PLUS_COPY.ownedByOtherNoName(familyName)}</Text>
        </Tray>
      );
    default: {
      // readyYearly, readyFounding, purchasing, finishing, failed, restoring, restoreNothing, lapsed.
      const busy = state === 'purchasing' || state === 'finishing' || state === 'restoring';
      const p = state === 'purchasing' && phase.kind === 'purchasing' ? phase.pick : pick;
      const title =
        state === 'purchasing'
          ? PLUS_COPY.buying
          : state === 'finishing'
            ? PLUS_COPY.finishing
            : state === 'failed'
              ? PLUS_COPY.tryAgain
              : PLUS_COPY.buy(p, price(p));
      return (
        <View>
          {state === 'lapsed' ? (
            <Tray style={styles.gapBottom}>
              <Text style={type.bodySmall}>{lapsedLine(plus)}</Text>
            </Tray>
          ) : null}
          <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
            <PriceTile name={PLUS_COPY.yearlyName} price={PLUS_COPY.yearlyPrice(price('annual'))} picked={p === 'annual'} onPress={() => onPick('annual')} disabled={busy} />
            <PriceTile name={PLUS_COPY.foundingName} price={PLUS_COPY.foundingPrice(price('lifetime'))} picked={p === 'lifetime'} onPress={() => onPick('lifetime')} disabled={busy} />
          </View>
          {state === 'failed' && phase.kind === 'failed' ? (
            <Text style={[type.bodySmall, styles.error]} accessibilityLiveRegion="polite">
              {phase.message}
            </Text>
          ) : null}
          {state === 'restoreNothing' ? (
            <Text style={[type.bodySmall, styles.info]} accessibilityLiveRegion="polite">
              {PLUS_COPY.restoreNothing}
            </Text>
          ) : null}
          <SolidButton title={title} onPress={state === 'failed' ? onRetry : onBuy} busy={state === 'purchasing' || state === 'finishing'} disabled={state === 'restoring'} style={styles.gap16} />
          {state === 'finishing' && phase.kind === 'finishing' && phase.slow ? (
            <Text style={[type.bodySmall, styles.center, styles.gap12]} accessibilityLiveRegion="polite">
              {PLUS_COPY.finishingSlow}
            </Text>
          ) : null}
          <TextAction label={PLUS_COPY.notNow} onPress={onClose} style={styles.notNow} />
          <Text style={[type.label, styles.small]}>{p === 'annual' ? PLUS_COPY.smallPrintYearly : PLUS_COPY.smallPrintFounding}</Text>
        </View>
      );
    }
  }
}

/** A price choice: a flat solid tile. Picked, it fills ember with steam text; otherwise birch with a char hairline. */
function PriceTile({ name, price, picked, onPress, disabled }: { name: string; price: string; picked: boolean; onPress: () => void; disabled?: boolean }) {
  const on = useSharedValue(picked ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(picked ? 1 : 0, timing.utility));
  }, [picked, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.tile, picked ? styles.tilePicked : styles.tileOff]}
      accessibilityRole="radio"
      accessibilityState={{ selected: picked, disabled }}
      accessibilityLabel={`${name}, ${price}`}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.tileFill, fill]} />
      <Text style={[type.bodyStrong, picked && styles.onEmber]}>{name}</Text>
      <Text style={[type.bodySmallStrong, styles.tilePrice, picked && styles.onEmber]}>{price}</Text>
    </Pressable>
  );
}

/** A tip's price: a small flat aspen tile. */
function PriceChip({ label, onPress, disabled, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Text style={type.bodySmallStrong}>{label}</Text>
    </Pressable>
  );
}

function Tray({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.tray, style]}>{children}</View>;
}

/** The thank-you settles in. */
function Arrive({ children }: { children: React.ReactNode }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(withTiming(1, timing.settle));
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.inset, paddingTop: space.s4 },
  previewTag: { alignSelf: 'flex-start', backgroundColor: palette.aspen, borderRadius: radii.slatSmall, paddingHorizontal: space.s8, paddingVertical: space.s4 },
  previewText: { color: palette.smoke },
  wallCard: {},
  wallRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s20 },
  wall: { flex: 9 },
  woods: { flex: 8, gap: space.s8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, width: 88 },
  swatch: { width: 40, padding: space.s4, borderRadius: radii.slatSmall },
  swatchOn: { backgroundColor: palette.aspen },
  swatchGap: { marginTop: space.s4 },
  title: { marginTop: space.s24 },
  lead: { marginTop: space.s8 },
  covers: { marginTop: space.s8 },
  features: { marginTop: space.s20, overflow: 'hidden' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s16, paddingVertical: space.s8 },
  featureRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha.hairline },
  featureFocus: { backgroundColor: palette.aspen },
  featureText: { flex: 1 },
  mark: { width: 32, height: 32, borderRadius: radii.round, backgroundColor: palette.birch, alignItems: 'center', justifyContent: 'center' },
  block: { marginTop: space.s24 },
  tiles: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s12 },
  tile: { flex: 1, minHeight: 88, borderRadius: radii.tile, borderCurve: 'continuous', padding: space.s16, justifyContent: 'center', overflow: 'hidden' },
  tileOff: { backgroundColor: palette.birch, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.char },
  tilePicked: { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.ember },
  tileFill: { backgroundColor: palette.ember },
  tilePrice: { marginTop: space.s4, color: palette.char },
  onEmber: { color: palette.steam },
  error: { color: palette.coal, marginTop: space.s12 },
  info: { color: palette.smoke, marginTop: space.s12 },
  notNow: { alignSelf: 'center', marginTop: space.s12 },
  small: { textAlign: 'center', marginTop: space.s8 },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: space.s20, marginTop: space.s20 },
  note: { color: palette.smoke, textAlign: 'center', marginTop: space.s12 },
  signOff: { marginTop: space.s24, textAlign: 'center' },
  tipsLabel: { marginTop: space.s40, marginBottom: space.s4, paddingHorizontal: space.s8 },
  tipsBody: { paddingHorizontal: space.s8, marginBottom: space.s12 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s16, paddingVertical: space.s12 },
  tipName: { flex: 1 },
  tipSkeleton: { padding: space.s16, gap: space.s12 },
  chip: { minWidth: 72, minHeight: layout.touch, paddingHorizontal: space.s12, borderRadius: radii.slatSmall, backgroundColor: palette.aspen, alignItems: 'center', justifyContent: 'center' },
  chipPressed: { backgroundColor: palette.grain },
  tray: { backgroundColor: palette.steam, borderRadius: radii.card, borderCurve: 'continuous', padding: space.s20 },
  gapBottom: { marginBottom: space.s16 },
  center: { textAlign: 'center' },
  gap8: { marginTop: space.s8 },
  gap12: { marginTop: space.s12 },
  gap16: { marginTop: space.s16 },
  gap24: { marginTop: space.s24 },
});
