// The web's icon set (src/components/icons.tsx), drawn with react-native-svg.
import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/theme';

type P = { size?: number; filled?: boolean; color?: string; strokeWidth?: number };

function Icon({ size = 22, filled, color = C.wine, strokeWidth = 1.4, children }: P & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const Heart = ({ size = 26, ...p }: P) => (
  <Icon size={size} {...p}>
    <Path d="M12 20.3s-7.6-4.6-9.2-9.4C1.6 7.3 3.9 4 7.3 4c2 0 3.4 1.1 4.7 2.8C13.3 5.1 14.7 4 16.7 4c3.4 0 5.7 3.3 4.5 6.9-1.6 4.8-9.2 9.4-9.2 9.4Z" />
  </Icon>
);

export const Bookmark = ({ size = 26, ...p }: P) => (
  <Icon size={size} {...p}>
    <Path d="M6.5 3.8h11v16.7L12 16.6l-5.5 3.9V3.8Z" />
  </Icon>
);

export const Share = ({ size = 26, ...p }: P) => (
  <Icon size={size} {...p} filled={false}>
    <Path d="M12 3.6v11.2M7.8 7.6 12 3.6l4.2 4M5 12.6v6.3c0 .7.6 1.3 1.3 1.3h11.4c.7 0 1.3-.6 1.3-1.3v-6.3" />
  </Icon>
);

export const Read = (p: P) => (
  <Icon {...p} filled={false}>
    <Path d="M4.5 5.5h15M4.5 12h15M4.5 18.5h9" />
  </Icon>
);

export const Shelf = (p: P) => (
  <Icon {...p} filled={false}>
    <Path d="M6.5 3.8h11v16.7L12 16.6l-5.5 3.9V3.8Z" />
  </Icon>
);

export const Person = (p: P) => (
  <Icon {...p} filled={false}>
    <Circle cx="12" cy="8.4" r="3.9" />
    <Path d="M4.8 20.2c1.1-3.6 3.9-5.5 7.2-5.5s6.1 1.9 7.2 5.5" />
  </Icon>
);

export const Arrow = ({ size = 16, ...p }: P) => (
  <Icon size={size} strokeWidth={1.6} {...p} filled={false}>
    <Path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5" />
  </Icon>
);

export const Back = (p: P) => (
  <Icon {...p} filled={false}>
    <Path d="M19.5 12H4.5M10 6.5 4.5 12l5.5 5.5" />
  </Icon>
);
