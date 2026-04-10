import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';

interface Props {
  name: IconName;
  color: string;
  focused: boolean;
}

export type { IconName };

/**
 * Tab bar icon — adds a subtle focus pill under the icon so the
 * active tab reads clearly without competing color.
 */
export const TabIcon: React.FC<Props> = ({ name, color, focused }) => (
  <View style={styles.wrap}>
    <Icon name={name} size={22} color={color} strokeWidth={focused ? 1.9 : 1.5} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
});
