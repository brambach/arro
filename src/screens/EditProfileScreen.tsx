import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextButton } from '../components/TextButton';
import { TextField } from '../components/TextField';
import { useApp, useView } from '../state/AppState';
import { showError } from '../state/confirm';
import { pickPhoto } from '../state/photos';
import { RootStackScreenProps } from '../navigation/types';

/** Edit profile: the name and photo your family sees. The colour is automatic and stays. */
export function EditProfileScreen({ navigation }: RootStackScreenProps<'EditProfile'>) {
  const insets = useSafeAreaInsets();
  const { me } = useView();
  const { updateProfile } = useApp();
  const [name, setName] = useState(me.name);
  const [photoUri, setPhotoUri] = useState<string | null>(typeof me.photoUri === 'string' ? me.photoUri : null);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Cancel">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={type.title}>Edit profile</Text>
        <View style={styles.avatarWrap}>
          <AvatarRing name={name || me.name} color={me.color} photoUri={photoUri} size={96} />
          <TextButton
            label={photoUri ? 'Choose a different photo' : 'Choose a photo'}
            onPress={async () => {
              const uri = await pickPhoto();
              if (uri) setPhotoUri(uri);
            }}
            style={{ fontSize: 15, marginTop: 14 }}
          />
          {photoUri ? <TextButton label="Remove photo" onPress={() => setPhotoUri(null)} style={{ fontSize: 14, marginTop: 10, color: colors.muted }} /> : null}
        </View>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={24} />
        <Text style={styles.note}>Your colour is picked for you, so everyone in the family has a different one.</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton
          title="Save"
          disabled={!name.trim()}
          onPress={async () => {
            try {
              await updateProfile({ name, photoUri });
              navigation.goBack();
            } catch {
              showError('Couldn’t save', 'Check your connection and try again.');
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 22, paddingTop: 10 },
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { height: 40, paddingHorizontal: 22, justifyContent: 'center' },
  cancel: { fontSize: 15.5, color: colors.muted, fontWeight: weights.medium },
  body: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24 },
  avatarWrap: { alignItems: 'center', marginVertical: 24 },
  note: { fontSize: 12.5, lineHeight: 17, color: colors.faint, marginTop: 12 },
});
