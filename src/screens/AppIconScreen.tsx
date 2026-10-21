import React, { useState } from 'react';
import { DeviceEventEmitter, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { APP_ICONS, AppIconName } from '../state/look';
import { canChangeAppIcon } from '../state/appIcon';
import { alpha, homeScreen, palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceList } from '../components/ChoiceList';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { devDriverOn } from '../dev/DevDriver';

export const APP_ICON_COPY = {
  title: 'App icon',
  lead: 'The icon on your home screen. Everyone picks their own.',
  icons: 'Icons',
  plusIcon: 'Included with Plus',
  tryOn: 'Tap to try it on',
  tryingOn: 'Trying it on. Nothing is saved.',
  keep: 'Keep this icon with Plus',
  back: (name: string) => `Back to ${name}`,
  saved: (name: string) => `Your icon is ${name} now. iOS will say so too.`,
  cantChange: 'This build can’t change the icon. It will once it’s updated.',
};

/** The 180 px renders of each icon (scripts/generate-icons.mjs). */
export const ICON_IMAGES: Record<AppIconName, ImageSourcePropType> = {
  default: require('../../assets/brand/out/alt/icon-default-180.png'),
  NightStone: require('../../assets/brand/out/alt/icon-night-180.png'),
  Cedar: require('../../assets/brand/out/alt/icon-cedar-180.png'),
  Lake: require('../../assets/brand/out/alt/icon-lake-180.png'),
};

/**
 * Me > App icon (Plus): the warm stone is free; Night stone, Cedar and Lake
 * come with Plus. Each person picks their own. Without Plus, tapping one
 * tries it on a home screen above (nothing changes on the phone) with "Keep
 * this icon with Plus". When a plan ends the icon goes back to the default.
 */
export function AppIconScreen({ navigation }: RootStackScreenProps<'AppIcon'>) {
  const view = useView();
  const { look, myLook, setLook } = useApp();
  const unlocked = view.plus.visible && view.plus.active;
  const [tryOn, setTryOn] = useState<AppIconName | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const saved = unlocked ? myLook.appIcon : look.appIcon;
  const shown = tryOn ?? saved;
  const icons = view.plus.visible ? APP_ICONS : APP_ICONS.filter((i) => !i.plus);
  const nameOf = (id: AppIconName) => APP_ICONS.find((i) => i.id === id)?.name ?? '';

  const pick = (icon: AppIconName) => {
    setLine(null);
    const meta = APP_ICONS.find((i) => i.id === icon);
    if (meta?.plus && !unlocked) {
      setTryOn(icon === saved ? null : icon);
      return;
    }
    setTryOn(null);
    if (icon === saved) return;
    setLook({ appIcon: icon });
    setLine(canChangeAppIcon() ? APP_ICON_COPY.saved(nameOf(icon)) : APP_ICON_COPY.cantChange);
  };

  React.useEffect(() => {
    if (!devDriverOn) return;
    const sub = DeviceEventEmitter.addListener('pickIcon', (i: AppIconName) => pick(i));
    return () => sub.remove();
  });

  return (
    <SubScreen
      title={APP_ICON_COPY.title}
      lead={APP_ICON_COPY.lead}
      onBack={() => navigation.goBack()}
      footer={
        tryOn ? (
          <>
            <SolidButton title={APP_ICON_COPY.keep} onPress={() => navigation.navigate('Plus', { focus: 'appIcon', icon: tryOn })} />
            <TextAction label={APP_ICON_COPY.back(nameOf(saved))} onPress={() => setTryOn(null)} style={styles.back} />
          </>
        ) : undefined
      }
    >
      <HomeScreen icon={shown} />
      {tryOn ? <Text style={[type.label, styles.trying]}>{APP_ICON_COPY.tryingOn}</Text> : null}

      <Text style={[type.caption, styles.label]}>{APP_ICON_COPY.icons}</Text>
      <ChoiceList
        accessibilityLabel={APP_ICON_COPY.icons}
        value={shown}
        onChange={pick}
        items={icons.map((i) => ({
          value: i.id,
          title: i.name,
          subtitle: !i.plus ? i.detail : unlocked ? `${i.detail}. ${APP_ICON_COPY.plusIcon}` : `${i.detail}. ${APP_ICON_COPY.tryOn}`,
          leading: <Image source={ICON_IMAGES[i.id]} style={styles.small} accessibilityIgnoresInvertColors />,
        }))}
      />
      {line ? <Text style={[type.bodySmall, styles.line]}>{line}</Text> : null}
    </SubScreen>
  );
}

/** A home screen, close up: the icon among a few quiet neighbors, with its name under it. */
function HomeScreen({ icon }: { icon: AppIconName }) {
  return (
    <View style={styles.home} accessible accessibilityLabel={`Your home screen with the ${APP_ICONS.find((i) => i.id === icon)?.name} icon`}>
      <LinearGradient colors={[homeScreen[0].color, homeScreen[1].color, homeScreen[2].color]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.row}>
        <View style={styles.ghost} />
        <View style={styles.app}>
          <Image source={ICON_IMAGES[icon]} style={styles.big} accessibilityIgnoresInvertColors />
          <Text style={[type.label, styles.appName]}>Saunafam</Text>
        </View>
        <View style={styles.ghost} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  home: { height: 220, borderRadius: radii.card, borderCurve: 'continuous', overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' },
  app: { alignItems: 'center', gap: space.s8 },
  big: { width: 96, height: 96, borderRadius: 22, borderCurve: 'continuous' },
  appName: { color: palette.steam },
  ghost: { width: 72, height: 72, marginTop: space.s12, borderRadius: 17, borderCurve: 'continuous', backgroundColor: alpha.pressOnDark },
  small: { width: 40, height: 40, borderRadius: 9, borderCurve: 'continuous' },
  trying: { marginTop: space.s12, textAlign: 'center' },
  label: { marginTop: space.s32, marginBottom: space.s8, marginHorizontal: space.s8 },
  line: { color: palette.smoke, marginTop: space.s12, marginHorizontal: space.s8 },
  back: { marginTop: space.s8 },
});
