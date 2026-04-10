import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'check'
  | 'calendar'
  | 'owl'
  | 'mic'
  | 'send'
  | 'plus'
  | 'flame'
  | 'sparkle'
  | 'arrowRight'
  | 'chevronRight'
  | 'close';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Tiny, hand-drawn icon set. Thin strokes (1.5pt) to match iOS SF Symbols.
 * Keeping these inline as SVG avoids pulling in an entire icon font.
 */
export const Icon: React.FC<Props> = ({
  name,
  size = 22,
  color = colors.text,
  strokeWidth = 1.6,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {renderPath(name, color, strokeWidth)}
  </Svg>
);

const stroke = (d: string, color: string, sw: number) => (
  <Path
    d={d}
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const renderPath = (name: IconName, color: string, sw: number) => {
  switch (name) {
    case 'home':
      return stroke('M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-6h4v6', color, sw);
    case 'check':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={sw} />
          {stroke('M8.5 12.2 11 14.5l4.5-5', color, sw)}
        </>
      );
    case 'calendar':
      return stroke(
        'M4.5 7.5h15v12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-12ZM4.5 10.5h15M8 4.5v4M16 4.5v4',
        color,
        sw,
      );
    case 'owl':
      // A minimal owl glyph — two round eyes + head outline + tuft.
      return (
        <>
          {stroke('M5 12a7 7 0 0 1 14 0v4a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-4Z', color, sw)}
          {stroke('M7.5 7 5.5 4.5M16.5 7 18.5 4.5', color, sw)}
          <Circle cx="9.3" cy="11.5" r="1.6" stroke={color} strokeWidth={sw} />
          <Circle cx="14.7" cy="11.5" r="1.6" stroke={color} strokeWidth={sw} />
          {stroke('M11 14.5l1 1 1-1', color, sw)}
        </>
      );
    case 'mic':
      return stroke(
        'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM6 11a6 6 0 0 0 12 0M12 17v4',
        color,
        sw,
      );
    case 'send':
      return stroke('M4.5 12 20 5l-4.5 15-4-7L4.5 12Z', color, sw);
    case 'plus':
      return stroke('M12 5v14M5 12h14', color, sw);
    case 'flame':
      return stroke(
        'M12 21c-4 0-6-2.7-6-6 0-3 2-4 3-6 .8 1 1.5 1 2 0 .5-1 .2-2.5-.5-4 3 1 5 4 5 7 0 1 .5 1.5 1 1 .6-.6.5-2 0-3 2 2 2 5 0 8-1 1.7-2.5 3-4.5 3Z',
        color,
        sw,
      );
    case 'sparkle':
      return stroke(
        'M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M6.5 17.5l2.8-2.8M14.7 9.3l2.8-2.8',
        color,
        sw,
      );
    case 'arrowRight':
      return stroke('M5 12h14M13 6l6 6-6 6', color, sw);
    case 'chevronRight':
      return stroke('M9 6l6 6-6 6', color, sw);
    case 'close':
      return stroke('M6 6l12 12M18 6L6 18', color, sw);
  }
};
