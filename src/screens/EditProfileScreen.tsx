import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Avatar } from '../components/Avatar';
import { Field } from '../components/Field';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { useApp, useView } from '../state/AppState';
import { PHOTOS_ON, pickPhoto } from '../state/photos';
import { RootStackScreenProps } from '../navigation/types';

export const EDIT_PROFILE_COPY = {
  title: 'Edit profile',
  choose: 'Choose a photo',
  change: 'Choose a different photo',
  remove: 'Remove photo',
  name: 'Name',
  nameHint: 'Your first name is plenty. It’s what your family sees.',
  color: 'Your color is picked for you, so everyone in the family has a different one.',
  save: 'Save',
};

/**
 * Edit profile: the name and photo your family sees. Saves optimistically and
 * rolls back quietly (app.notice) if the server says no. The color stays.
 */
export function EditProfileScreen({ navigation }: RootStackScreenProps<'EditProfile'>) {
  const { me } = useView();
  const { updateProfile } = useApp();
  const [name, setName] = useState(me.name);
  const [photoUri, setPhotoUri] = useState<string | null>(typeof me.photoUri === 'string' ? me.photoUri : null);
  // Only a new or removed photo is saved; the one already showing came from the server.
  const [photoChanged, setPhotoChanged] = useState(false);

  return (
    <SubScreen
      modal
      title={EDIT_PROFILE_COPY.title}
      onBack={() => navigation.goBack()}
      footer={
        <SolidButton
          title={EDIT_PROFILE_COPY.save}
          disabled={!name.trim()}
          onPress={() => {
            // Optimistic: the change shows at once and the sheet closes.
            updateProfile(photoChanged ? { name, photoUri } : { name }).catch(() => undefined);
            navigation.goBack();
          }}
        />
      }
    >
      <View style={styles.avatar}>
        <Avatar name={name || me.name} color={me.color} photoUri={photoUri} size={112} accessible />
        {PHOTOS_ON ? (
          <TextAction
            label={photoUri ? EDIT_PROFILE_COPY.change : EDIT_PROFILE_COPY.choose}
            onPress={async () => {
              const uri = await pickPhoto('square');
              if (uri) {
                setPhotoUri(uri);
                setPhotoChanged(true);
              }
            }}
            style={styles.choose}
          />
        ) : null}
        {photoUri ? (
          <TextAction
            label={EDIT_PROFILE_COPY.remove}
            size="bodySmall"
            tone="coal"
            onPress={() => {
              setPhotoUri(null);
              setPhotoChanged(true);
            }}
          />
        ) : null}
      </View>
      <Field
        label={EDIT_PROFILE_COPY.name}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="givenName"
        maxLength={24}
        hint={EDIT_PROFILE_COPY.nameHint}
      />
      <View style={styles.colorRow}>
        <View style={[styles.dot, { backgroundColor: me.color }]} />
        <Text style={[type.label, styles.colorText]}>{EDIT_PROFILE_COPY.color}</Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', marginBottom: space.s24 },
  choose: { marginTop: space.s16 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s24, marginHorizontal: space.s8 },
  dot: { width: 12, height: 12, borderRadius: radii.round, borderColor: palette.steam },
  colorText: { flexShrink: 1 },
});
