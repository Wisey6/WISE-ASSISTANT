import React from 'react';
import { View, ViewStyle } from 'react-native';

import { statusColors } from '@/theme';
import type { Status } from '@/types/dashboard';

interface Props {
  status: Status;
  size?: number;
  style?: ViewStyle;
}

export const StatusDot: React.FC<Props> = ({ status, size = 8, style }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusColors[status],
      },
      style,
    ]}
  />
);
