import { Platform, type ViewStyle } from "react-native";

export const mobileTheme = {
  colors: {
    screenBase: "#07111D",
    screenElevated: "#0E1C2A",
    screenContrast: "#15283B",
    chromeTint: "rgba(132, 216, 255, 0.18)",
    chromeTintWarm: "rgba(246, 210, 139, 0.14)",
    chromeTintRose: "rgba(255, 141, 141, 0.14)",
    cardBackground: "rgba(10, 19, 31, 0.72)",
    cardBackgroundStrong: "rgba(13, 24, 37, 0.82)",
    cardBorder: "rgba(255, 255, 255, 0.12)",
    cardBorderStrong: "rgba(255, 255, 255, 0.18)",
    textPrimary: "#F8FBFF",
    textSecondary: "#D7E5F4",
    textMuted: "#95A9BD",
    accentBlue: "#8AD7FF",
    accentMint: "#7EF1C2",
    accentGold: "#F6D28B",
    accentRose: "#FFB1A8",
    actionBlue: "#5EB5FF",
    actionBlueStrong: "#2E8DF4",
    actionNeutral: "rgba(255, 255, 255, 0.08)",
    actionNeutralBorder: "rgba(255, 255, 255, 0.14)",
    qrCanvas: "#FFFFFF",
  },
  radius: {
    chip: 16,
    button: 18,
    card: 26,
    qr: 32,
    tabBar: 28,
  },
  spacing: {
    screenHorizontal: 20,
    screenVertical: 28,
  },
} as const;

export const surfaceShadowStyle: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#020617",
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 14,
    },
  },
  android: {
    elevation: 12,
    shadowColor: "#020617",
  },
  default: {
    shadowColor: "#020617",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
  },
});

export const interactiveSurfaceShadowStyle: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#061321",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  android: {
    elevation: 8,
    shadowColor: "#061321",
  },
  default: {
    shadowColor: "#061321",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
});
