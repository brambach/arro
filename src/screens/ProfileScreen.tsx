import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { ProfileView } from '../state/buildView';
import { depth, gradients, layout, palette, radii, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Arrive } from '../components/Arrive';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { FixedDigits } from '../components/FixedDigits';
import { Icon, IconName } from '../components/Icon';
import { ListGroup, ListRow } from '../components/ListRow';
import { NoticeToast } from '../components/NoticeToast';
import { Screen } from '../components/Screen';
import { Bone } from '../components/Skeleton';
import { TextAction } from '../components/TextAction';

/**
 * Me (spec, section 3): your name and family with Edit profile, a 2 x 2 grid
 * (weeks in a row, longest, sessions this month, hours in the heat this year),
 * favorite type and place, your last three sessions, badges at 4, 8, 12, 26
 * and 52 weeks, the Plus rows only when plus_enabled, and the gear to Settings.
 */
export function ProfileScreen({ navigation }: MainTabScreenProps<'Me'>) {
  const view = useView();
  const { refresh } = useApp();
  const p = view.profile;
  const loading = view.status === 'loading';

  return (
    <View style={styles.root}>
      <Screen onRefresh={refresh} contentStyle={styles.content}>
        <Arrive index={0}>
          <View style={styles.top}>
            <Avatar name={p.name} color={view.me.color} photoUri={typeof p.photoUri === 'string' ? p.photoUri : null} size={64} accessible />
            <View style={styles.who}>
              <Text style={type.title} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header" numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={type.bodySmall}>{p.familyName}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.gear} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={space.s8}>
              <Icon name="gear" size={26} color={palette.smoke} />
            </Pressable>
          </View>
          <TextAction label="Edit profile" onPress={() => navigation.navigate('EditProfile')} size="bodySmall" style={styles.edit} />
        </Arrive>

        <Arrive index={1}>
          <View style={styles.grid}>
            {p.stats.map((s) => (
              <Card key={s.key} style={styles.stat} padding={space.s16}>
                {loading ? (
                  <Bone width={48} height={38} />
                ) : (
                  <View style={styles.statValue}>
                    <FixedDigits value={s.value} variant="title" color={palette.coal} accessibilityLabel={`${s.value}${s.unit ? ` ${s.unit}` : ''}`} />
                    {s.unit ? <Text style={[type.label, styles.unit]}>{s.unit}</Text> : null}
                  </View>
                )}
                <Text style={[type.label, styles.statLabel]}>{s.label}</Text>
              </Card>
            ))}
          </View>
        </Arrive>

        <Arrive index={2}>
          {p.favoriteType || p.favoritePlace ? (
            <ListGroup inset="leading" style={styles.block}>
              {[
                ...(p.favoriteType ? [<ListRow key="type" title={p.favoriteType} subtitle="Favorite type" leading={<Mark name="traditional" />} />] : []),
                ...(p.favoritePlace ? [<ListRow key="place" title={p.favoritePlace} subtitle="Favorite place" leading={<Mark name="family" />} />] : []),
              ]}
            </ListGroup>
          ) : null}

          <Text style={[type.caption, styles.label]} accessibilityRole="header">
            Your last sessions
          </Text>
          {p.recent.length ? (
            <ListGroup>
              {p.recent.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.details}
                  subtitle={[c.when, c.pending ? 'Waiting to send' : c.place].filter(Boolean).join(' · ')}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: c.id })}
                />
              ))}
            </ListGroup>
          ) : (
            <Card>
              <Text style={type.bodySmall}>{loading ? 'Loading your sessions' : 'Your sessions show here once you’ve logged one.'}</Text>
            </Card>
          )}
        </Arrive>

        <Arrive index={3}>
          <Text style={[type.caption, styles.label]} accessibilityRole="header">
            Badges
          </Text>
          <Card>
            <Badges badges={p.badges} onOpen={(weeks) => navigation.navigate('Milestone', { kind: 'personal', weeks })} />
          </Card>

          {p.plusRows ? (
            <ListGroup inset="leading" style={styles.block}>
              <ListRow title="Heat log" leading={<Mark name="thermometer" />} value="Plus" valueTone="quiet" onPress={() => navigation.navigate('Plus', { focus: 'heatLog' })} />
              <ListRow title="Timer face" leading={<Mark name="timer" />} value="Plus" valueTone="quiet" onPress={() => navigation.navigate('Plus', { focus: 'timerFace' })} />
              <ListRow title="App icon" leading={<Mark name="stone" />} value="Plus" valueTone="quiet" onPress={() => navigation.navigate('Plus', { focus: 'appIcon' })} />
            </ListGroup>
          ) : null}
        </Arrive>
      </Screen>
      <NoticeToast />
    </View>
  );
}

function Mark({ name }: { name: IconName }) {
  return (
    <View style={styles.mark}>
      <Icon name={name} size={22} color={palette.smoke} />
    </View>
  );
}

/** Five stones: lit once your longest streak reaches them. A lit one opens its card. */
function Badges({ badges, onOpen }: { badges: ProfileView['badges']; onOpen: (weeks: number) => void }) {
  return (
    <View style={styles.badges}>
      {badges.map((b) => (
        <Pressable
          key={b.weeks}
          onPress={b.earned ? () => onOpen(b.weeks) : undefined}
          disabled={!b.earned}
          style={styles.badge}
          accessibilityRole={b.earned ? 'button' : 'text'}
          accessibilityLabel={`${b.label}, ${b.earned ? 'earned' : 'not yet'}`}
        >
          <View style={[styles.disc, b.earned ? styles.discOn : styles.discOff]}>
            {b.earned ? (
              <LinearGradient
                colors={[gradients.emberButton[0].color, gradients.emberButton[1].color, gradients.emberButton[2].color]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[type.headingStrong, b.earned ? styles.numOn : styles.numOff]} allowFontScaling={false}>
              {b.weeks}
            </Text>
          </View>
          <Text style={type.label}>weeks</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space.s40 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s16, paddingHorizontal: space.s8, paddingTop: space.s12 },
  who: { flex: 1 },
  gear: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  edit: { alignSelf: 'flex-start', marginLeft: space.s8, marginTop: space.s8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12, marginTop: space.s20 },
  // One height for all four, so a label that wraps doesn't make its row taller than the other.
  stat: { width: '47%', flexGrow: 1, minHeight: 120 },
  statValue: { flexDirection: 'row', alignItems: 'baseline', gap: space.s4 },
  unit: { color: palette.smoke },
  statLabel: { marginTop: space.s4 },
  block: { marginTop: space.s16 },
  label: { marginTop: space.s32, marginBottom: space.s8, paddingHorizontal: space.s8 },
  mark: { width: 38, height: 38, borderRadius: radii.round, backgroundColor: palette.aspen, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { alignItems: 'center', gap: space.s4 },
  disc: { width: 52, height: 52, borderRadius: radii.round, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  discOn: { boxShadow: depth.button },
  discOff: { backgroundColor: palette.aspen, boxShadow: depth.sunk },
  numOn: { color: palette.steam },
  numOff: { color: palette.smoke },
});
