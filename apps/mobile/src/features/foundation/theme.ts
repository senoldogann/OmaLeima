import type { ViewStyle } from "react-native";

export type MobileThemeMode = "dark" | "light";

type TypographyTokens = {
  families: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
  };
  sizes: {
    display: number;
    title: number;
    titleLarge: number;
    subtitle: number;
    body: number;
    bodySmall: number;
    caption: number;
    eyebrow: number;
    number: number;
  };
  lineHeights: {
    display: number;
    title: number;
    titleLarge: number;
    subtitle: number;
    body: number;
    bodySmall: number;
    caption: number;
    eyebrow: number;
    number: number;
  };
};

type RadiusTokens = {
  chip: number;
  button: number;
  card: number;
  scene: number;
  qr: number;
  tabBar: number;
  inner: number;
};

type SpacingTokens = {
  screenHorizontal: number;
  screenVertical: number;
  sectionGap: number;
  cardPadding: number;
  scenePadding: number;
};

type ColorTokens = {
  screenBase: string;
  surfaceL1: string;
  surfaceL2: string;
  surfaceL3: string;
  surfaceL4: string;
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  borderMuted: string;
  lime: string;
  limeStrong: string;
  limeDim: string;
  limeSurface: string;
  limeBorder: string;
  pink: string;
  pinkStrong: string;
  pinkDim: string;
  pinkSurface: string;
  pinkBorder: string;
  cyan: string;
  cyanStrong: string;
  cyanDim: string;
  cyanSurface: string;
  cyanBorder: string;
  amber: string;
  amberStrong: string;
  amberSurface: string;
  amberBorder: string;
  success: string;
  successSurface: string;
  successBorder: string;
  danger: string;
  dangerSurface: string;
  dangerBorder: string;
  warning: string;
  warningSurface: string;
  warningBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  qrCanvas: string;
  accentBlue: string;
  accentIndigo: string;
  accentViolet: string;
  accentMint: string;
  accentGold: string;
  accentAmber: string;
  accentRose: string;
  accentCoral: string;
  chromeTint: string;
  chromeTintWarm: string;
  chromeTintRose: string;
  chromeTintIndigo: string;
  chromeTintViolet: string;
  cardBackground: string;
  cardBackgroundStrong: string;
  cardBackgroundSoft: string;
  cardBorder: string;
  cardBorderStrong: string;
  cardHighlight: string;
  actionBlue: string;
  actionBlueStrong: string;
  actionNeutral: string;
  actionNeutralBorder: string;
  actionPrimary: string;
  actionPrimaryStrong: string;
  successSurfaceLegacy: string;
  progressTrack: string;
  haloIndigo: string;
  haloViolet: string;
  haloRose: string;
  haloAmber: string;
  haloTeal: string;
  glowIndigo: string;
  glowGold: string;
  glowMint: string;
  glowRose: string;
  glowSuccess: string;
  glowDanger: string;
  glowWarning: string;
  screenElevated: string;
  screenContrast: string;
  screenHighlight: string;
  textSoft: string;
};

export type MobileTheme = {
  mode: MobileThemeMode;
  colors: ColorTokens;
  typography: TypographyTokens;
  radius: RadiusTokens;
  spacing: SpacingTokens;
};

const typography: TypographyTokens = {
  families: {
    regular: "Poppins_400Regular",
    medium: "Poppins_500Medium",
    semibold: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
    extrabold: "Poppins_800ExtraBold",
  },
  sizes: {
    display: 52,
    title: 30,
    titleLarge: 36,
    subtitle: 20,
    body: 15,
    bodySmall: 13,
    caption: 12,
    eyebrow: 11,
    number: 64,
  },
  lineHeights: {
    display: 54,
    title: 38,
    titleLarge: 44,
    subtitle: 28,
    body: 22,
    bodySmall: 19,
    caption: 17,
    eyebrow: 15,
    number: 62,
  },
};

const radius: RadiusTokens = {
  chip: 6,
  button: 10,
  card: 14,
  scene: 16,
  qr: 16,
  tabBar: 20,
  inner: 10,
};

const spacing: SpacingTokens = {
  screenHorizontal: 20,
  screenVertical: 24,
  sectionGap: 14,
  cardPadding: 20,
  scenePadding: 24,
};

export const darkMobileTheme: MobileTheme = {
  mode: "dark",
  colors: {
    screenBase: "#000000",
    surfaceL1: "#060806",
    surfaceL2: "#0B0E0B",
    surfaceL3: "#111511",
    surfaceL4: "#171C17",
    borderDefault: "rgba(255, 255, 255, 0.035)",
    borderSubtle: "rgba(255, 255, 255, 0.018)",
    borderStrong: "rgba(255, 255, 255, 0.065)",
    borderMuted: "rgba(255, 255, 255, 0.045)",
    lime: "#C8FF47",
    limeStrong: "#AEFF00",
    limeDim: "#8FCC1A",
    limeSurface: "rgba(200, 255, 71, 0.09)",
    limeBorder: "rgba(200, 255, 71, 0.18)",
    pink: "#E8F0E8",
    pinkStrong: "#FFFFFF",
    pinkDim: "#9AA39A",
    pinkSurface: "rgba(255, 255, 255, 0.035)",
    pinkBorder: "rgba(255, 255, 255, 0.05)",
    cyan: "#EEF5EE",
    cyanStrong: "#FFFFFF",
    cyanDim: "#A2AEA2",
    cyanSurface: "rgba(255, 255, 255, 0.03)",
    cyanBorder: "rgba(255, 255, 255, 0.05)",
    amber: "#F2F7E8",
    amberStrong: "#FFFFFF",
    amberSurface: "rgba(255, 255, 255, 0.03)",
    amberBorder: "rgba(255, 255, 255, 0.05)",
    success: "#C8FF47",
    successSurface: "rgba(200, 255, 71, 0.08)",
    successBorder: "rgba(200, 255, 71, 0.12)",
    danger: "#E6ECE6",
    dangerSurface: "rgba(255, 255, 255, 0.03)",
    dangerBorder: "rgba(255, 255, 255, 0.05)",
    warning: "#E6ECE6",
    warningSurface: "rgba(255, 255, 255, 0.03)",
    warningBorder: "rgba(255, 255, 255, 0.05)",
    textPrimary: "#F5F7F1",
    textSecondary: "rgba(245, 247, 241, 0.78)",
    textMuted: "rgba(245, 247, 241, 0.52)",
    textDim: "rgba(245, 247, 241, 0.34)",
    qrCanvas: "#FFFFFF",
    accentBlue: "#E8F0E8",
    accentIndigo: "#C8FF47",
    accentViolet: "#E8F0E8",
    accentMint: "#C8FF47",
    accentGold: "#E8F0E8",
    accentAmber: "#E8F0E8",
    accentRose: "#E8F0E8",
    accentCoral: "#E8F0E8",
    chromeTint: "rgba(255, 255, 255, 0.03)",
    chromeTintWarm: "rgba(255, 255, 255, 0.03)",
    chromeTintRose: "rgba(255, 255, 255, 0.03)",
    chromeTintIndigo: "rgba(200, 255, 71, 0.08)",
    chromeTintViolet: "rgba(255, 255, 255, 0.03)",
    cardBackground: "#060806",
    cardBackgroundStrong: "#0B0E0B",
    cardBackgroundSoft: "rgba(255, 255, 255, 0.03)",
    cardBorder: "rgba(255, 255, 255, 0.05)",
    cardBorderStrong: "rgba(255, 255, 255, 0.08)",
    cardHighlight: "rgba(255, 255, 255, 0.03)",
    actionBlue: "#E8F0E8",
    actionBlueStrong: "#FFFFFF",
    actionNeutral: "rgba(255, 255, 255, 0.04)",
    actionNeutralBorder: "rgba(255, 255, 255, 0.00)",
    actionPrimary: "#C8FF47",
    actionPrimaryStrong: "#AEFF00",
    successSurfaceLegacy: "rgba(200, 255, 71, 0.08)",
    progressTrack: "rgba(255, 255, 255, 0.045)",
    haloIndigo: "transparent",
    haloViolet: "transparent",
    haloRose: "transparent",
    haloAmber: "transparent",
    haloTeal: "transparent",
    glowIndigo: "transparent",
    glowGold: "transparent",
    glowMint: "transparent",
    glowRose: "transparent",
    glowSuccess: "transparent",
    glowDanger: "transparent",
    glowWarning: "transparent",
    screenElevated: "#060806",
    screenContrast: "#0B0E0B",
    screenHighlight: "#111511",
    textSoft: "rgba(245, 247, 241, 0.44)",
  },
  typography,
  radius,
  spacing,
};

export const lightMobileTheme: MobileTheme = {
  mode: "light",
  colors: {
    screenBase: "#F5F7F1",
    surfaceL1: "#FFFFFF",
    surfaceL2: "#EEF2E7",
    surfaceL3: "#E7ECDf",
    surfaceL4: "#DDE4D5",
    borderDefault: "rgba(8, 12, 8, 0.06)",
    borderSubtle: "rgba(8, 12, 8, 0.035)",
    borderStrong: "rgba(8, 12, 8, 0.12)",
    borderMuted: "rgba(8, 12, 8, 0.08)",
    lime: "#9DDC27",
    limeStrong: "#7DB400",
    limeDim: "#6B9513",
    limeSurface: "rgba(157, 220, 39, 0.14)",
    limeBorder: "rgba(157, 220, 39, 0.28)",
    pink: "#111611",
    pinkStrong: "#050705",
    pinkDim: "#4F5B4F",
    pinkSurface: "rgba(8, 12, 8, 0.05)",
    pinkBorder: "rgba(8, 12, 8, 0.08)",
    cyan: "#111611",
    cyanStrong: "#050705",
    cyanDim: "#516051",
    cyanSurface: "rgba(8, 12, 8, 0.045)",
    cyanBorder: "rgba(8, 12, 8, 0.08)",
    amber: "#111611",
    amberStrong: "#050705",
    amberSurface: "rgba(8, 12, 8, 0.04)",
    amberBorder: "rgba(8, 12, 8, 0.08)",
    success: "#6E970B",
    successSurface: "rgba(157, 220, 39, 0.14)",
    successBorder: "rgba(157, 220, 39, 0.26)",
    danger: "#202620",
    dangerSurface: "rgba(8, 12, 8, 0.04)",
    dangerBorder: "rgba(8, 12, 8, 0.08)",
    warning: "#202620",
    warningSurface: "rgba(8, 12, 8, 0.04)",
    warningBorder: "rgba(8, 12, 8, 0.08)",
    textPrimary: "#0A0D09",
    textSecondary: "rgba(10, 13, 9, 0.76)",
    textMuted: "rgba(10, 13, 9, 0.56)",
    textDim: "rgba(10, 13, 9, 0.36)",
    qrCanvas: "#FFFFFF",
    accentBlue: "#111611",
    accentIndigo: "#9DDC27",
    accentViolet: "#111611",
    accentMint: "#9DDC27",
    accentGold: "#111611",
    accentAmber: "#111611",
    accentRose: "#111611",
    accentCoral: "#111611",
    chromeTint: "rgba(8, 12, 8, 0.04)",
    chromeTintWarm: "rgba(8, 12, 8, 0.04)",
    chromeTintRose: "rgba(8, 12, 8, 0.04)",
    chromeTintIndigo: "rgba(157, 220, 39, 0.12)",
    chromeTintViolet: "rgba(8, 12, 8, 0.04)",
    cardBackground: "#FFFFFF",
    cardBackgroundStrong: "#EEF2E7",
    cardBackgroundSoft: "rgba(8, 12, 8, 0.03)",
    cardBorder: "rgba(8, 12, 8, 0.06)",
    cardBorderStrong: "rgba(8, 12, 8, 0.10)",
    cardHighlight: "rgba(255, 255, 255, 0.7)",
    actionBlue: "#111611",
    actionBlueStrong: "#050705",
    actionNeutral: "rgba(8, 12, 8, 0.05)",
    actionNeutralBorder: "rgba(8, 12, 8, 0)",
    actionPrimary: "#9DDC27",
    actionPrimaryStrong: "#7DB400",
    successSurfaceLegacy: "rgba(157, 220, 39, 0.14)",
    progressTrack: "rgba(8, 12, 8, 0.08)",
    haloIndigo: "transparent",
    haloViolet: "transparent",
    haloRose: "transparent",
    haloAmber: "transparent",
    haloTeal: "transparent",
    glowIndigo: "transparent",
    glowGold: "transparent",
    glowMint: "transparent",
    glowRose: "transparent",
    glowSuccess: "transparent",
    glowDanger: "transparent",
    glowWarning: "transparent",
    screenElevated: "#FFFFFF",
    screenContrast: "#EEF2E7",
    screenHighlight: "#E7ECDF",
    textSoft: "rgba(10, 13, 9, 0.42)",
  },
  typography,
  radius,
  spacing,
};

export const getMobileTheme = (mode: MobileThemeMode): MobileTheme =>
  mode === "light" ? lightMobileTheme : darkMobileTheme;

// Legacy compat export for files not yet migrated in this branch slice.
export const mobileTheme = darkMobileTheme;

export const surfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 10px 22px rgba(0, 0, 0, 0.08)",
};

export const interactiveSurfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.06)",
};

export const sceneShadowStyle: ViewStyle = {
  boxShadow: "0px 12px 28px rgba(0, 0, 0, 0.08)",
};

export const limeBorderStyle: ViewStyle = {
  borderColor: "rgba(200, 255, 71, 0.18)",
  borderWidth: 1,
};

export const indigoGlowStyle: ViewStyle = {
  borderColor: "rgba(255, 255, 255, 0.06)",
  borderWidth: 1,
};
