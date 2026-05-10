import { Svg, Circle, Path, Rect } from "react-native-svg";

type AppIconName =
  | "apple"
  | "google"
  | "business"
  | "user"
  | "info"
  | "logout"
  | "bell"
  | "check"
  | "check-circle"
  | "circle"
  | "clock"
  | "mail"
  | "scan"
  | "history"
  | "calendar"
  | "map-pin"
  | "palette"
  | "globe"
  | "support"
  | "send"
  | "gift"
  | "star"
  | "tools"
  | "x"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "id-card"
  | "search"
  | "filter"
  | "zap";

type AppIconProps = {
  name: AppIconName;
  color: string;
  size: number;
};

export const AppIcon = ({ name, color, size }: AppIconProps) => {
  switch (name) {
    case "apple":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M16.2 12.35c-.03-2.18 1.78-3.25 1.86-3.3-1.03-1.5-2.62-1.7-3.17-1.72-1.34-.14-2.64.8-3.32.8-.7 0-1.75-.78-2.88-.75-1.47.02-2.84.87-3.6 2.2-1.55 2.7-.4 6.66 1.1 8.84.75 1.07 1.62 2.27 2.76 2.22 1.1-.05 1.52-.71 2.86-.71 1.33 0 1.72.71 2.88.69 1.2-.03 1.95-1.08 2.67-2.16.86-1.22 1.2-2.42 1.21-2.48-.03-.01-2.34-.9-2.37-3.63Z"
            fill={color}
          />
          <Path
            d="M14.02 5.9c.6-.73 1-1.74.9-2.75-.86.04-1.93.6-2.55 1.32-.56.64-1.05 1.69-.92 2.67.97.08 1.95-.5 2.57-1.24Z"
            fill={color}
          />
        </Svg>
      );
    case "google":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M21.805 12.23c0-.688-.062-1.35-.176-1.987H12v3.762h5.502a4.705 4.705 0 0 1-2.04 3.086v2.564h3.302c1.932-1.779 3.041-4.401 3.041-7.425Z"
            fill={color}
          />
          <Path
            d="M12 22c2.754 0 5.062-.913 6.75-2.472l-3.302-2.564c-.914.613-2.083.976-3.448.976-2.65 0-4.895-1.79-5.697-4.195H2.89v2.645A10 10 0 0 0 12 22Z"
            fill={color}
            opacity={0.82}
          />
          <Path
            d="M6.303 13.745A5.99 5.99 0 0 1 6 12c0-.605.104-1.193.303-1.745V7.61H2.89A10 10 0 0 0 2 12c0 1.612.386 3.138 1.071 4.39l3.232-2.645Z"
            fill={color}
            opacity={0.62}
          />
          <Path
            d="M12 6.06c1.497 0 2.842.516 3.9 1.53l2.925-2.926C17.057 3.02 14.75 2 12 2A10 10 0 0 0 2.89 7.61l3.413 2.645C7.105 7.85 9.35 6.06 12 6.06Z"
            fill={color}
            opacity={0.42}
          />
        </Svg>
      );
    case "business":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Rect fill={color} height="14" opacity={0.18} rx="2.5" width="14" x="5" y="7" />
          <Path
            d="M7 20V9.5A1.5 1.5 0 0 1 8.5 8h7A1.5 1.5 0 0 1 17 9.5V20M10 20v-3h4v3M9.5 11.5h1M13.5 11.5h1M9.5 14.5h1M13.5 14.5h1M4 20h16M10 8V6.8A.8.8 0 0 1 10.8 6h2.4a.8.8 0 0 1 .8.8V8"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "user":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle cx="12" cy="8" fill={color} opacity={0.16} r="4.5" />
          <Path
            d="M5.5 19.25c1.2-3.25 3.45-4.9 6.5-4.9 3.05 0 5.3 1.65 6.5 4.9"
            fill={color}
            opacity={0.16}
          />
          <Path
            d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM5.75 19.5c1.03-3.01 3.2-4.52 6.25-4.52s5.22 1.51 6.25 4.52"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "info":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="8"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Path
            d="M12 10.2v5.2M12 7.75h.01"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "logout":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M10 6H7.5A1.5 1.5 0 0 0 6 7.5v9A1.5 1.5 0 0 0 7.5 18H10M14 8l4 4-4 4M18 12h-8"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </Svg>
      );
    case "bell":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M9 18a3 3 0 0 0 6 0M6 17h12l-1.2-1.4a3 3 0 0 1-.8-1.95V10a4 4 0 1 0-8 0v3.65c0 .72-.28 1.41-.8 1.95L6 17Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "check":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle cx="12" cy="12" fill={color} opacity={0.14} r="8" />
          <Path
            d="m8.2 12.3 2.35 2.35 5.25-5.25"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="8"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "mail":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Rect
            fill="none"
            height="13"
            rx="2.5"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            width="16"
            x="4"
            y="5.5"
          />
          <Path
            d="m5.5 7 6.5 5 6.5-5"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "scan":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5A2.5 2.5 0 0 1 17.5 20H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16M7 12h10"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </Svg>
      );
    case "history":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M4 12a8 8 0 1 0 2.3-5.66M4 4v4h4M12 8v4l2.75 1.75"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </Svg>
      );
    case "calendar":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Rect fill={color} height="12" opacity={0.14} rx="2.5" width="16" x="4" y="7" />
          <Path
            d="M8 4v3M16 4v3M4 10h16M6.5 7h11A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-9A1.5 1.5 0 0 1 6.5 7Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Circle cx="9" cy="13" fill={color} r="1" />
          <Circle cx="12" cy="13" fill={color} opacity={0.66} r="1" />
          <Circle cx="15" cy="13" fill={color} opacity={0.42} r="1" />
        </Svg>
      );
    case "map-pin":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M12 21s6.5-5.65 6.5-11.05A6.5 6.5 0 0 0 5.5 9.95C5.5 15.35 12 21 12 21Z"
            fill={color}
            opacity={0.16}
          />
          <Path
            d="M12 21s6.5-5.65 6.5-11.05A6.5 6.5 0 0 0 5.5 9.95C5.5 15.35 12 21 12 21Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Circle
            cx="12"
            cy="10"
            fill="none"
            r="2.35"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "palette":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M12 3.5A8.5 8.5 0 1 0 12 20.5h1.45a1.8 1.8 0 0 0 0-3.6H12.8a1.55 1.55 0 0 1 0-3.1h2.05A5.65 5.65 0 0 0 20.5 8.2 4.7 4.7 0 0 0 15.8 3.5H12Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Circle cx="7.8" cy="11" fill={color} r="1.05" />
          <Circle cx="10.2" cy="7.5" fill={color} opacity={0.82} r="1.05" />
          <Circle cx="14.2" cy="7.5" fill={color} opacity={0.58} r="1.05" />
        </Svg>
      );
    case "globe":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="8"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Path
            d="M4.5 12h15M12 4c2.1 2.3 3.2 5 3.2 8S14.1 17.7 12 20M12 4c-2.1 2.3-3.2 5-3.2 8s1.1 5.7 3.2 8"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "support":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="7.25"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Path
            d="M8.2 14.4V11.8a3.8 3.8 0 0 1 7.6 0v2.6M8.2 11.9H6.8a1.8 1.8 0 0 0-1.8 1.8v.7a1.8 1.8 0 0 0 1.8 1.8h1.4M15.8 11.9h1.4a1.8 1.8 0 0 1 1.8 1.8v.7a1.8 1.8 0 0 1-1.8 1.8h-1.4M10.3 18.2c.42.38.98.6 1.57.6h.26c.59 0 1.15-.22 1.57-.6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "send":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M4.8 11.4 18.5 5.2c.86-.39 1.7.46 1.31 1.31L13.6 20.2c-.42.92-1.75.84-2.06-.13l-1.5-4.72a1.7 1.7 0 0 0-1.1-1.1L4.93 12.77c-.97-.3-1.05-1.63-.13-2.05Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Path
            d="m10.8 13.2 8-8"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "tools":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M14.6 5.4a3.1 3.1 0 0 0 3.95 3.95l-7.9 7.9a2.8 2.8 0 1 1-3.96-3.96l7.9-7.9Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Path
            d="m13.8 4.6 1.6 1.6M17.8 8.6l1.6 1.6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "x":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="m9 6 6 6-6 6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </Svg>
      );
    case "chevron-left":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="m15 6-6 6 6 6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </Svg>
      );
    case "check-circle":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle cx="12" cy="12" fill={color} opacity={0.22} r="8" />
          <Path
            d="m8.2 12.3 2.35 2.35 5.25-5.25"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </Svg>
      );
    case "circle":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="8"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "clock":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle cx="12" cy="12" fill={color} opacity={0.14} r="8" />
          <Path
            d="M12 7.5v4.75l2.75 1.6"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Circle
            cx="12"
            cy="12"
            fill="none"
            r="8"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "gift":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Rect
            fill={color}
            height="11"
            opacity={0.14}
            rx="2"
            width="16"
            x="4"
            y="9"
          />
          <Path
            d="M4.5 9.5h15v3h-15v-3ZM6 12.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6.5M12 9.5V20M12 8.8c-.85-2.65-2.18-4.05-3.67-4.05-.96 0-1.83.68-1.83 1.62 0 1.48 1.93 2.43 5.5 2.43ZM12 8.8c.85-2.65 2.18-4.05 3.67-4.05.96 0 1.83.68 1.83 1.62 0 1.48-1.93 2.43-5.5 2.43Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "star":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M12 2.5l2.63 5.33 5.88.86-4.26 4.15 1.01 5.86L12 15.97l-5.26 2.73 1.01-5.86L3.49 8.69l5.88-.86L12 2.5Z"
            fill={color}
            opacity={0.22}
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </Svg>
      );
    case "id-card":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Rect fill={color} height="13" opacity={0.13} rx="2.5" width="18" x="3" y="5.5" />
          <Path
            d="M5.5 5.5h13A2.5 2.5 0 0 1 21 8v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16V8a2.5 2.5 0 0 1 2.5-2.5Z"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <Circle cx="9" cy="11" fill={color} opacity={0.22} r="2.2" />
          <Path
            d="M6 16.5c.4-1.9 1.6-2.8 3-2.8s2.6.9 3 2.8"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <Path
            d="M14.5 10.5h3M14.5 13.5h2"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </Svg>
      );
    case "search":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle cx="11" cy="11" fill="none" r="7" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <Path d="M16.5 16.5L21 21" fill="none" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
        </Svg>
      );
    case "filter":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path
            d="M4.5 7h15M7.5 12h9M10 17h4"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </Svg>
      );
    case "zap":
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path d="M13 2L4.09 12.5H11L10 22l9-11.5H13L13 2Z" fill={color} opacity={0.9} />
        </Svg>
      );
  }
};
