import type { ViewStyle } from "react-native";

export const mobileTheme = {
  colors: {
    screenBase: "#050916",
    screenElevated: "#0C1324",
    screenContrast: "#131D34",
    screenHighlight: "#18274B",
    chromeTint: "rgba(98, 180, 255, 0.22)",
    chromeTintWarm: "rgba(255, 200, 122, 0.18)",
    chromeTintRose: "rgba(255, 121, 164, 0.16)",
    chromeTintIndigo: "rgba(121, 111, 255, 0.18)",
    cardBackground: "rgba(8, 16, 31, 0.78)",
    cardBackgroundStrong: "rgba(10, 21, 40, 0.9)",
    cardBackgroundSoft: "rgba(255, 255, 255, 0.05)",
    cardBorder: "rgba(255, 255, 255, 0.12)",
    cardBorderStrong: "rgba(255, 255, 255, 0.22)",
    cardHighlight: "rgba(255, 255, 255, 0.08)",
    textPrimary: "#F8FBFF",
    textSecondary: "#DCE8F8",
    textMuted: "#9FB4CC",
    textSoft: "#7992AE",
    accentBlue: "#90D7FF",
    accentIndigo: "#9389FF",
    accentMint: "#82F3C7",
    accentGold: "#FFD98A",
    accentRose: "#FFB0CD",
    accentCoral: "#FF9F8A",
    actionBlue: "#69BDFF",
    actionBlueStrong: "#377DFF",
    actionNeutral: "rgba(255, 255, 255, 0.08)",
    actionNeutralBorder: "rgba(255, 255, 255, 0.16)",
    successSurface: "rgba(93, 241, 176, 0.14)",
    warningSurface: "rgba(255, 217, 138, 0.14)",
    dangerSurface: "rgba(255, 137, 150, 0.14)",
    progressTrack: "rgba(255, 255, 255, 0.08)",
    qrCanvas: "#FFFFFF",
  },
  radius: {
    chip: 18,
    button: 20,
    card: 30,
    qr: 34,
    tabBar: 30,
  },
  spacing: {
    screenHorizontal: 20,
    screenVertical: 28,
    sectionGap: 18,
    cardPadding: 20,
  },
} as const;

export const surfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 18px 28px rgba(2, 6, 23, 0.34)",
};

export const interactiveSurfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 12px 20px rgba(6, 19, 33, 0.26)",
};
