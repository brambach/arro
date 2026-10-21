import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import type { PastWeekRow } from '../data/types';
import { posterData } from '../state/archive';
import { haptics } from '../theme/haptics';
import { depth, layout, palette, radii, space, WoodName } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { Bone } from '../components/Skeleton';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { POSTER_H, POSTER_W, PosterHandle, WallPoster } from '../components/WallPoster';
import { devDriverOn } from '../dev/DevDriver';

export const POSTER_COPY = {
  title: 'The wall poster',
  lead: 'Every week your family has kept, ready to print at 6 by 8 inches or bigger.',
  save: 'Save or print',
  saving: 'Getting it ready...',
  failed: 'Couldn’t make the poster. Try again.',
  loadFailed: 'Couldn’t load your weeks. Check your connection and try again.',
  tryAgain: 'Try again',
  empty: 'The poster fills in as weeks close. Your first one is still on the wall.',
};

/**
 * Week > Print the wall (Plus): the whole wall as a print-ready poster with
 * the family's name and dates. Save or print goes through the share sheet,
 * which has Save Image and Print.
 */
export function PosterScreen({ navigation }: RootStackScreenProps<'Poster'>) {
  const view = useView();
  const { loadArchive } = useApp();
  const { width } = useWindowDimensions();
  const poster = useRef<PosterHandle>(null);
  const [history, setHistory] = useState<PastWeekRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadArchive()
      .then((a) => {
        if (alive) setHistory(a.history);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [loadArchive, attempt]);
  const load = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const data = useMemo(() => (history ? posterData(history, view.me.id) : null), [history, view.me.id]);
  const shown = width - layout.gutter * 2 - space.s40;

  const save = async () => {
    setBusy(true);
    setLine(null);
    try {
      const b64 = await poster.current?.toPng();
      if (b64) await Share.share({ url: `data:image/png;base64,${b64}` });
    } catch {
      haptics.error();
      setLine(POSTER_COPY.failed);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!devDriverOn) return;
    const sub = DeviceEventEmitter.addListener('posterSave', () => void save());
    return () => sub.remove();
  });

  return (
    <SubScreen
      title={POSTER_COPY.title}
      lead={POSTER_COPY.lead}
      onBack={() => navigation.goBack()}
      footer={data && data.weeks.length ? <SolidButton title={busy ? POSTER_COPY.saving : POSTER_COPY.save} onPress={save} disabled={busy} /> : undefined}
    >
      {failed ? (
        <Card>
          <Text style={type.bodySmall}>{POSTER_COPY.loadFailed}</Text>
          <TextAction label={POSTER_COPY.tryAgain} onPress={load} tone="coal" size="bodySmall" style={styles.retry} />
        </Card>
      ) : !data ? (
        <View style={styles.frame} accessible accessibilityLabel="Loading the poster">
          <Bone width={shown} height={(shown * POSTER_H) / POSTER_W} radius={radii.slatSmall} />
        </View>
      ) : !data.weeks.length ? (
        <Card>
          <Text style={type.bodySmall}>{POSTER_COPY.empty}</Text>
        </Card>
      ) : (
        <View style={styles.frame} accessible accessibilityLabel={`${view.familyName}: a poster of ${data.weeks.length} weeks, ${data.summary}`}>
          <View style={styles.paper}>
            <WallPoster
              ref={poster}
              weeks={data.weeks}
              wood={view.week.wall.wood as WoodName}
              familyName={view.familyName}
              dates={data.dates}
              summary={data.summary}
              nail={view.week.wall.nail}
              width={shown}
            />
          </View>
        </View>
      )}
      {line ? <Text style={[type.bodySmall, styles.line]}>{line}</Text> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center' },
  paper: { boxShadow: depth.card },
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
  line: { color: palette.coal, marginTop: space.s12, marginHorizontal: space.s8 },
});
