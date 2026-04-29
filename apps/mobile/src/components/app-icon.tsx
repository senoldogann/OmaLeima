import { Svg, Circle, Path, Rect } from "react-native-svg";

type AppIconName =
  | "google"
  | "business"
  | "user"
  | "logout"
  | "bell"
  | "scan"
  | "history"
  | "calendar"
  | "chevron-right";

type AppIconProps = {
  name: AppIconName;
  color: string;
  size: number;
};

export const AppIcon = ({ name, color, size }: AppIconProps) => {
  switch (name) {
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
  }
};
