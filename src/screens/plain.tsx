/**
 * Plain stand-ins for the screens M8 to M10 rebuild. They show the data layer's
 * view models as text and buttons so every state can be reached and checked,
 * with no styling of their own (the design system lands with M6). Delete this
 * file once nothing imports it.
 */
import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/AppState';

export function PlainScreen({
  title,
  onBack,
  onRefresh,
  children,
}: {
  title: string;
  onBack?: () => void;
  onRefresh?: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { view, notice, clearNotice } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = onRefresh
    ? () => {
        setRefreshing(true);
        onRefresh().finally(() => setRefreshing(false));
      }
    : undefined;
  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 12 }}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} /> : undefined}
    >
      {onBack ? <Btn title="Back" onPress={onBack} /> : null}
      <Text style={{ fontSize: 28, fontWeight: '600' }} accessibilityRole="header">
        {title}
      </Text>
      {view?.status === 'loading' ? <P muted>Loading your family…</P> : null}
      {view?.status === 'error' ? <P muted>Couldn’t load your family. Pull to try again.</P> : null}
      {view?.offline ? <P muted>Offline. Anything you log is saved and sends when you’re back.</P> : null}
      {notice ? <Row label={notice} value="OK" onPress={clearNotice} /> : null}
      {children}
    </ScrollView>
  );
}

export function P({ children, muted, strong, style }: { children: React.ReactNode; muted?: boolean; strong?: boolean; style?: TextStyle }) {
  return <Text style={[{ fontSize: 16, lineHeight: 22 }, muted && { opacity: 0.6 }, strong && { fontWeight: '600' }, style]}>{children}</Text>;
}

export function H({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', opacity: 0.6, marginTop: 12 }} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 }}
    >
      <Text style={{ fontSize: 16, flex: 1 }}>{label}</Text>
      {value ? <Text style={{ fontSize: 16, opacity: 0.6 }}>{value}</Text> : null}
    </Pressable>
  );
}

export function Btn({ title, onPress, disabled, selected }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, selected }}
      style={{ paddingVertical: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <Text style={{ fontSize: 16, fontWeight: selected ? '700' : '600', textDecorationLine: selected ? 'underline' : 'none' }}>{title}</Text>
    </Pressable>
  );
}

/** A row of choices. */
export function Choices<T extends string | number>({
  options,
  value,
  onChange,
  label = (o) => String(o),
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  label?: (o: T) => string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {options.map((o) => (
        <Btn key={String(o)} title={label(o)} selected={o === value} onPress={() => onChange(o)} />
      ))}
    </View>
  );
}

/** ●●○ */
export function dotsText(dots: boolean[]): string {
  return dots.map((d) => (d ? '●' : '○')).join('');
}
