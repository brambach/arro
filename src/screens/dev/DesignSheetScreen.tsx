import React, { createContext, useContext, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  alpha,
  depth,
  layout,
  memberNames,
  memberPalette,
  palette,
  PaletteName,
  radii,
  space,
  spaceScale,
  WoodName,
} from '../../theme/tokens';
import { type, TypeStyle } from '../../theme/typography';
import { curves, durations, loops, moments, springs, stagger, timing } from '../../theme/motion';
import { haptics, hapticTable, HapticMoment } from '../../theme/haptics';
import { Backdrop } from '../../components/Backdrop';
import { Card } from '../../components/Card';
import { SolidButton } from '../../components/SolidButton';
import { TextAction } from '../../components/TextAction';
import { ListGroup, ListRow } from '../../components/ListRow';
import { Field } from '../../components/Field';
import { Toggle } from '../../components/Toggle';
import { Avatar } from '../../components/Avatar';
import { EmberDots } from '../../components/EmberDots';
import { Slat, SlatState } from '../../components/Slat';
import { SlatWall, WallWeek } from '../../components/SlatWall';
import { HeatGlow } from '../../components/HeatGlow';
import { SteamWisps } from '../../components/SteamWisps';
import { SparkBurst } from '../../components/SparkBurst';
import { FixedDigits } from '../../components/FixedDigits';
import { Icon, iconGroups } from '../../components/Icon';
import { StoneMark } from '../../components/brand/StoneMark';
import { Wordmark } from '../../components/brand/Wordmark';
import { AnimatedSplash } from '../../components/AnimatedSplash';
import type { RootStackScreenProps } from '../../navigation/types';

/**
 * The Design sheet (dev builds only): every token and component in one place,
 * with a replay for each motion token and key moment. Reachable from Settings
 * in a dev build, or straight away with EXPO_PUBLIC_DEV_SCREEN=DesignSheet.
 */
const PALETTE_USE: Record<PaletteName, string> = {
  birch: 'screen background',
  steam: 'cards and sheets',
  aspen: 'trays, wells, empty slats',
  grain: 'hairlines, dividers',
  stone: 'meta text, small caps, icons',
  pebble: 'graphics only (the spec stone)',
  smoke: 'secondary text',
  char: 'primary text, the dark room',
  ember: 'the one accent',
  coal: 'pressed, ember-colored text',
  glow: 'heat, gradients only',
  lake: 'cold plunge, freezes',
  moss: 'kept, quietly',
};

const TYPE_ROWS: { key: TypeStyle; label: string; sample: string }[] = [
  { key: 'display', label: 'display 64/64', sample: '12' },
  { key: 'title', label: 'title 34/38', sample: 'Good evening, Sam' },
  { key: 'heading', label: 'heading 24/28', sample: 'weeks together' },
  { key: 'body', label: 'body 17/24', sample: 'Maya has kept this week.' },
  { key: 'bodySmall', label: 'body small 15/21', sample: "Jo's on 2, Sam is on 1." },
  { key: 'label', label: 'label 13/18', sample: 'Yesterday · 18 min with Jo' },
  { key: 'caption', label: 'caption 12/16, small caps', sample: 'This week' },
];

const WALL: WallWeek[] = [
  { state: 'kept' },
  { state: 'kept' },
  { state: 'frozen' },
  { state: 'kept' },
  { state: 'kept' },
  { state: 'paused' },
  { state: 'kept' },
  { state: 'kept' },
  { state: 'current', dots: { filled: 2, count: 3 } },
];
const WOODS: WoodName[] = ['birch', 'cedar', 'alder', 'charred_pine'];

/** For captures: EXPO_PUBLIC_DESIGN_SECTION="Key moments" opens scrolled to that section. */
// "Buttons@-400" scrolls 400 pt above the Buttons section.
const [startSection, startOffset] = (process.env.EXPO_PUBLIC_DESIGN_SECTION ?? '').split('@');
const SectionLayout = createContext<(title: string, y: number) => void>(() => undefined);

export function DesignSheetScreen({ navigation }: RootStackScreenProps<'DesignSheet'>) {
  const insets = useSafeAreaInsets();
  const [splashKey, setSplashKey] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const onSection = (title: string, y: number) => {
    if (title === startSection) scroll.current?.scrollTo({ y: y - insets.top + Number(startOffset ?? 0), animated: false });
  };
  return (
    <View style={styles.root}>
      <Backdrop />
      <SectionLayout.Provider value={onSection}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + space.s16, paddingBottom: insets.bottom + space.s56 },
          ]}
        >
          <View style={styles.topBar}>
            <Text style={type.caption}>Dev only</Text>
            {navigation.canGoBack() ? (
              <TextAction label="Close" onPress={() => navigation.goBack()} size="bodySmall" />
            ) : null}
          </View>
          <Text style={type.title}>Design sheet</Text>
          <Text style={[type.bodySmall, styles.lede]}>
            Löyly: birch, stone and ember. Every token and component in the app.
          </Text>

          <Section title="Icon and wordmark">
            <Card>
              <View style={styles.brandRow}>
                <StoneMark width={120} />
                <Wordmark fontSize={34} />
              </View>
              <TextAction label="Replay the splash" onPress={() => setSplashKey((k) => k + 1)} />
            </Card>
          </Section>

          <Section title="Palette">
            <Card padding={8}>
              {(Object.keys(palette) as PaletteName[]).map((name) => (
                <View key={name} style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: palette[name] }]} />
                  <View style={styles.flex}>
                    <Text style={type.bodyStrong}>{name}</Text>
                    <Text style={type.label}>{PALETTE_USE[name]}</Text>
                  </View>
                  <Text style={[type.label, styles.mono]}>{palette[name]}</Text>
                </View>
              ))}
            </Card>
          </Section>

          <Section title="Member colors, in join order">
            <Card>
              <View style={styles.wrapRow}>
                {memberPalette.map((c, i) => (
                  <View key={c} style={styles.member}>
                    <Avatar name={memberNames[i]} color={c} size={40} />
                    <Text style={type.label}>{memberNames[i]}</Text>
                    <Text style={[type.label, styles.mono]}>{c}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Section>

          <Section title="Type">
            <Card>
              {TYPE_ROWS.map((r) => (
                <View key={r.key} style={styles.typeRow}>
                  <Text style={type.caption}>{r.label}</Text>
                  <Text style={type[r.key]}>{r.sample}</Text>
                </View>
              ))}
              <View style={styles.typeRow}>
                <Text style={type.caption}>timer 96, fixed-width digits</Text>
                <View style={styles.timerBox}>
                  <FixedDigits value="12:40" color={palette.steam} />
                </View>
              </View>
            </Card>
          </Section>

          <Section title="Spacing, 4 pt grid">
            <Card>
              {spaceScale.map((s) => (
                <View key={s} style={styles.spaceRow}>
                  <Text style={[type.label, styles.spaceLabel]}>{s}</Text>
                  <View style={[styles.spaceBar, { width: s * 3 }]} />
                </View>
              ))}
            </Card>
          </Section>

          <Section title="Radii and depth">
            <View style={styles.wrapRow}>
              <DepthTile label={`card ${radii.card}`} style={{ borderRadius: radii.card, boxShadow: depth.card }} />
              <DepthTile label="float" style={{ borderRadius: radii.card, boxShadow: depth.float }} />
              <DepthTile
                label={`button ${radii.button}`}
                style={{ borderRadius: radii.button, boxShadow: depth.button, backgroundColor: palette.ember }}
              />
              <DepthTile
                label={`field ${radii.field}`}
                style={{ borderRadius: radii.field, boxShadow: depth.sunk, backgroundColor: palette.aspen }}
              />
            </View>
          </Section>

          <Section title="Motion">
            <Card>
              <CurveDemo
                name="settle"
                detail={`${durations.settle} ms, bezier(${curves.settle.join(', ')})`}
                run={(v) => v.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, timing.settle)))}
              />
              <CurveDemo
                name="ember"
                detail={`${durations.ember} ms, bezier(${curves.ember.join(', ')})`}
                run={(v) => v.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, timing.ember)))}
              />
              <CurveDemo
                name="utility"
                detail={`${durations.utility} ms, ease-out`}
                run={(v) => v.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, timing.utility)))}
              />
              <CurveDemo
                name="spring slat"
                detail={`damping ${springs.slat.damping}, stiffness ${springs.slat.stiffness}`}
                run={(v) => v.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, springs.slat)))}
              />
              <CurveDemo
                name="spring morph"
                detail={`damping ${springs.morph.damping}, stiffness ${springs.morph.stiffness}`}
                run={(v) => v.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, springs.morph)))}
              />
              <Text style={[type.label, styles.note]}>
                {`stagger ${stagger} ms · ${loops.glowBreathe.name} ${loops.glowBreathe.duration / 1000} s, ${loops.glowBreathe.from} to ${loops.glowBreathe.to} · ${loops.steamDrift.name} ${loops.steamDrift.duration / 1000} s`}
              </Text>
            </Card>
          </Section>

          <Section title="Key moments">
            <MomentsDemo />
          </Section>

          <Section title="Buttons">
            <Card>
              <View style={styles.stack}>
                <SolidButton
                  title="Start a session"
                  size="large"
                  icon={<Icon name="today" size={22} color={palette.steam} />}
                  onPress={() => haptics.timerStart()}
                />
                <SolidButton title="Save" onPress={() => haptics.save()} />
                <SolidButton title="Can't yet" disabled />
                <TextAction label="Log one I already did" onPress={() => undefined} />
                <TextAction label="Keep this wood with Plus" tone="coal" onPress={() => undefined} />
              </View>
            </Card>
            <View style={[styles.room, styles.stack]}>
              <SolidButton
                title="Throw löyly"
                tone="ash"
                fill={false}
                icon={<Icon name="ladle" size={22} color={palette.steam} />}
                onPress={() => haptics.loyly()}
              />
              <View style={styles.roomActions}>
                <TextAction label="Cancel" tone="steamDim" onPress={() => undefined} />
                <TextAction label="Add a round" tone="steam" onPress={() => undefined} />
                <TextAction label="Done" tone="steam" onPress={() => undefined} />
              </View>
            </View>
          </Section>

          <Section title="Rows, fields and toggles">
            <RowsDemo />
          </Section>

          <Section title="Slats and the wall">
            <SlatsDemo />
          </Section>

          <Section title="Icons, 24 pt grid">
            <Card>
              {iconGroups.map((g) => (
                <View key={g.title} style={styles.iconGroup}>
                  <Text style={type.caption}>{g.title}</Text>
                  <View style={styles.wrapRow}>
                    {g.names.map((n) => (
                      <View key={n} style={styles.iconCell}>
                        <Icon name={n} size={28} color={palette.char} />
                        <Text style={type.label} numberOfLines={1}>
                          {n}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </Card>
          </Section>

          <Section title="Haptics">
            <ListGroup>
              {hapticTable.map((h) => (
                <ListRow
                  key={h.moment}
                  title={h.moment}
                  value={h.kind.join(', then ')}
                  onPress={() => haptics[momentFn(h.moment)]()}
                  accessibilityHint="Plays the haptic"
                />
              ))}
            </ListGroup>
          </Section>
        </ScrollView>
      </SectionLayout.Provider>
      {splashKey > 0 ? <AnimatedSplash key={splashKey} ready returning={false} onDone={() => setSplashKey(0)} /> : null}
    </View>
  );
}

function momentFn(moment: string): HapticMoment {
  const map: Record<string, HapticMoment> = {
    'timer start': 'timerStart',
    '5-minute tick': 'fiveMinuteTick',
    löyly: 'loyly',
    finish: 'finish',
    save: 'save',
    cheer: 'cheer',
    'week kept': 'weekKept',
    milestone: 'milestone',
    errors: 'error',
  };
  return map[moment] ?? 'error';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const report = useContext(SectionLayout);
  return (
    <View style={styles.section} onLayout={(e) => report(title, e.nativeEvent.layout.y)}>
      <Text style={[type.caption, styles.sectionTitle]}>{title}</Text>
      {children}
    </View>
  );
}

function DepthTile({ label, style }: { label: string; style: object }) {
  return (
    <View style={styles.depthCell}>
      <View style={[styles.depthTile, style]} />
      <Text style={type.label}>{label}</Text>
    </View>
  );
}

type Shared = ReturnType<typeof useSharedValue<number>>;

function CurveDemo({ name, detail, run }: { name: string; detail: string; run: (v: Shared) => void }) {
  const v = useSharedValue(1);
  const [track, setTrack] = useState(0);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * track }] }));
  return (
    <View style={styles.curveRow}>
      <View style={styles.flex}>
        <Text style={type.bodyStrong}>{name}</Text>
        <Text style={type.label}>{detail}</Text>
        <View style={styles.curveTrack} onLayout={(e) => setTrack(e.nativeEvent.layout.width - space.s12)}>
          <Animated.View style={[styles.curveDot, dot]} />
        </View>
      </View>
      <TextAction label="Replay" size="bodySmall" onPress={() => run(v)} />
    </View>
  );
}

function MomentsDemo() {
  const roomW = useWindowDimensions().width - layout.gutter * 2;
  const [filled, setFilled] = useState(2);
  const [kept, setKept] = useState<SlatState>('current');
  const [sparks, setSparks] = useState(0);
  const [wallKey, setWallKey] = useState(1);
  const [door, setDoor] = useState(1);
  const [cooled, setCooled] = useState(false);
  const [warmth, setWarmth] = useState(0);
  const [burst, setBurst] = useState(0);
  const [wood, setWood] = useState(0);
  return (
    <View style={styles.stack}>
      <Card>
        <Text style={type.bodyStrong}>Check-in ignite</Text>
        <Text
          style={type.label}
        >{`ember ${moments.checkInIgnite.duration} ms; the save haptic fires at the peak`}</Text>
        <Slat
          state="current"
          height={54}
          dots={{ filled, count: 3 }}
          label="Week 8"
          onIgnitePeak={haptics.save}
          style={styles.demoGap}
        />
        <TextAction
          label={filled < 3 ? 'Ignite the next dot' : 'Reset'}
          size="bodySmall"
          onPress={() => setFilled((f) => (f < 3 ? f + 1 : 1))}
        />
      </Card>
      <Card>
        <Text style={type.bodyStrong}>Week kept, together</Text>
        <Text
          style={type.label}
        >{`fill ${moments.weekKept.fill.duration} ms, then ${moments.weekKept.sparks.count} sparks`}</Text>
        <View style={styles.demoGap}>
          <Slat
            key={kept === 'current' ? 'a' : 'b'}
            state={kept}
            height={54}
            dots={{ filled: 3, count: 3 }}
            onFilled={() => {
              haptics.weekKept();
              setSparks((n) => n + 1);
            }}
          />
          <View style={styles.sparkOrigin}>
            <SparkBurst burstKey={sparks} />
          </View>
        </View>
        <TextAction
          label={kept === 'current' ? 'Keep the week' : 'Reset'}
          size="bodySmall"
          onPress={() => setKept((k) => (k === 'current' ? 'kept' : 'current'))}
        />
      </Card>
      <Card>
        <Text style={type.bodyStrong}>Milestone wall</Text>
        <Text style={type.label}>{`one slat every ${moments.milestoneWall.perSlat} ms, dropping on a spring`}</Text>
        <View style={styles.wallBox}>
          <SlatWall key={wallKey} weeks={WALL} build onBuilt={haptics.milestone} />
        </View>
        <TextAction label="Build again" size="bodySmall" onPress={() => setWallKey((k) => k + 1)} />
      </Card>
      <Card>
        <Text style={type.bodyStrong}>Plus wood crossfade</Text>
        <Text
          style={type.label}
        >{`${moments.plusWoodCrossfade.duration} ms per slat, ${moments.plusWoodCrossfade.perSlat} ms apart`}</Text>
        <View style={styles.wallBox}>
          <SlatWall weeks={WALL} wood={WOODS[wood]} />
        </View>
        <TextAction
          label={`Wood: ${WOODS[wood].replace('_', ' ')}. Next`}
          size="bodySmall"
          onPress={() => setWood((w) => (w + 1) % WOODS.length)}
        />
      </Card>
      <View style={styles.roomTall}>
        <HeatGlow key={door} rise warmth={warmth} cooled={cooled} width={roomW} height={ROOM_H} />
        <SteamWisps width={roomW} height={ROOM_H} tone="dark" burstKey={burst} columns={[]} />
        <View style={styles.roomText}>
          <Text
            style={[type.caption, styles.onRoom]}
          >{`Door closes: room ${moments.doorCloses.room.duration} ms, glow ${moments.doorCloses.glowRise.duration} ms`}</Text>
          <FixedDigits value={`${10 + warmth}:40`} color={palette.steam} />
          <View style={styles.roomActions}>
            <TextAction
              label="Close the door"
              tone="steam"
              size="bodySmall"
              onPress={() => {
                setCooled(false);
                setDoor((d) => d + 1);
                haptics.timerStart();
              }}
            />
            <TextAction
              label="Warmer"
              tone="steam"
              size="bodySmall"
              onPress={() => {
                setWarmth((w) => (w + 1) % 6);
                haptics.fiveMinuteTick();
              }}
            />
          </View>
          <View style={styles.roomActions}>
            <TextAction
              label="Throw löyly"
              tone="steam"
              size="bodySmall"
              onPress={() => {
                setBurst((b) => b + 1);
                haptics.loyly();
              }}
            />
            <TextAction
              label={cooled ? 'Heat' : 'Finish (cool)'}
              tone="steam"
              size="bodySmall"
              onPress={() => {
                setCooled((c) => !c);
                if (!cooled) haptics.finish();
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const ROOM_H = 360;

function RowsDemo() {
  const [on, setOn] = useState(true);
  const [name, setName] = useState('');
  return (
    <View style={styles.stack}>
      <ListGroup inset="leading">
        <ListRow
          title="Maya"
          subtitle="Tonight · 20 min · 85°C"
          leading={<Avatar name="Maya" color={memberPalette[1]} size={38} />}
          trailing={<EmberDots count={3} filled={3} size="mini" />}
          value="Kept"
          valueTone="kept"
        />
        <ListRow
          title="Jo"
          subtitle="Yesterday · 18 min with Sam"
          leading={<Avatar name="Jo" color={memberPalette[2]} size={38} />}
          trailing={<EmberDots count={3} filled={2} size="mini" />}
          value="2 of 3"
        />
        <ListRow
          title="Sam"
          subtitle="Tuesday · 15 min"
          leading={<Avatar name="Sam" color={memberPalette[0]} size={38} />}
          trailing={<EmberDots count={3} filled={1} size="mini" />}
          value="1 of 3"
          onPress={() => undefined}
        />
      </ListGroup>
      <ListGroup>
        <ListRow title="Sessions a week" value="3 a week" onPress={() => undefined} />
        <ListRow
          title="Reminders"
          trailing={<Toggle value={on} onValueChange={setOn} accessibilityLabel="Reminders" />}
        />
        <ListRow title="Week of Oct 12" value="Kept" valueTone="quiet" />
      </ListGroup>
      <Card>
        <Field
          label="Family name"
          placeholder="Sunday sauna"
          value={name}
          onChangeText={setName}
          hint="Everyone in the family sees this."
        />
      </Card>
    </View>
  );
}

function SlatsDemo() {
  const states: SlatState[] = ['kept', 'frozen', 'paused', 'current', 'open'];
  return (
    <Card>
      <View style={styles.stack}>
        {states.map((s, i) => (
          <View key={s}>
            <Text style={type.caption}>{s}</Text>
            <Slat state={s} seed={i + 3} dots={{ filled: 2, count: 3 }} height={21} />
          </View>
        ))}
        {WOODS.map((w, i) => (
          <View key={w}>
            <Text style={type.caption}>{`${w.replace('_', ' ')}: open, then kept`}</Text>
            <View style={styles.woodPair}>
              <Slat state="open" wood={w} seed={i + 11} height={21} style={styles.flex} />
              <Slat state="kept" wood={w} seed={i + 12} height={21} style={styles.flex} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  content: { paddingHorizontal: layout.gutter },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.s8 },
  lede: { marginTop: space.s8, paddingHorizontal: space.s4 },
  section: { marginTop: layout.section },
  sectionTitle: { marginBottom: space.s8, marginLeft: space.s8 },
  brandRow: { alignItems: 'center', gap: space.s16, marginBottom: space.s8 },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s8 },
  swatch: { width: 40, height: 40, borderRadius: radii.slat, boxShadow: depth.card },
  flex: { flex: 1 },
  mono: { fontVariant: ['tabular-nums'] },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16 },
  member: { alignItems: 'center', gap: space.s4, width: 88 },
  typeRow: { marginBottom: space.s16, gap: space.s4 },
  timerBox: { backgroundColor: palette.char, borderRadius: radii.button, padding: space.s16, alignItems: 'center' },
  spaceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s8 },
  spaceLabel: { width: 24, textAlign: 'right' },
  spaceBar: { height: 12, borderRadius: radii.slatSmall, backgroundColor: palette.ember },
  depthCell: { alignItems: 'center', gap: space.s8 },
  depthTile: { width: 72, height: 72, backgroundColor: palette.steam },
  curveRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s16 },
  curveTrack: {
    height: 12,
    marginTop: space.s8,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    justifyContent: 'center',
  },
  curveDot: { width: 12, height: 12, borderRadius: radii.round, backgroundColor: palette.ember },
  note: { marginTop: space.s4 },
  stack: { gap: space.s16 },
  room: {
    marginTop: space.s16,
    backgroundColor: palette.char,
    borderRadius: radii.card,
    padding: space.s24,
    alignItems: 'center',
  },
  roomActions: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  roomTall: { height: ROOM_H, borderRadius: radii.card, overflow: 'hidden', backgroundColor: palette.char },
  roomText: { ...StyleSheet.absoluteFill, padding: space.s24, justifyContent: 'space-between', alignItems: 'center' },
  onRoom: { color: alpha.steam62 },
  demoGap: { marginVertical: space.s12 },
  sparkOrigin: { position: 'absolute', left: '50%', top: '50%' },
  wallBox: { marginVertical: space.s12, width: 200 },
  iconGroup: { marginBottom: space.s16, gap: space.s8 },
  iconCell: { width: 72, alignItems: 'center', gap: space.s4 },
  woodPair: { flexDirection: 'row', gap: space.s8 },
});
