import type { ViewStyle } from "react-native";

// ---------------------------------------------------------------------------
// STARK Design System
// Flat, opaque, typography-first. No glass, no blur, no halos.
// Color as the primary communicator of hierarchy and state.
// ---------------------------------------------------------------------------

export const mobileTheme = {
  colors: {
    // --- Base surfaces (solid, opaque) ---
    screenBase: "#000000",
    surfaceL1: "#060806",
    surfaceL2: "#0B0E0B",
    surfaceL3: "#111511",
    surfaceL4: "#171C17",

    // --- Borders ---
    borderDefault: "rgba(255, 255, 255, 0.035)",
    borderSubtle: "rgba(255, 255, 255, 0.018)",
    borderStrong: "rgba(255, 255, 255, 0.065)",
    borderMuted: "rgba(255, 255, 255, 0.045)",

    // --- Accent: Lime (hero, stamps, positive, active) ---
    lime: "#C8FF47",
    limeStrong: "#AEFF00",
    limeDim: "#8FCC1A",
    limeSurface: "rgba(200, 255, 71, 0.09)",
    limeBorder: "rgba(200, 255, 71, 0.18)",

    // --- Secondary accents collapse into the same family ---
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

    // --- Semantic ---
    success: "#C8FF47",
    successSurface: "rgba(200, 255, 71, 0.08)",
    successBorder: "rgba(200, 255, 71, 0.12)",

    danger: "#E6ECE6",
    dangerSurface: "rgba(255, 255, 255, 0.03)",
    dangerBorder: "rgba(255, 255, 255, 0.05)",

    warning: "#E6ECE6",
    warningSurface: "rgba(255, 255, 255, 0.03)",
    warningBorder: "rgba(255, 255, 255, 0.05)",

    // --- Typography ---
    textPrimary: "#F5F7F1",
    textSecondary: "rgba(245, 247, 241, 0.78)",
    textMuted: "rgba(245, 247, 241, 0.52)",
    textDim: "rgba(245, 247, 241, 0.34)",

    // --- QR (always white canvas) ---
    qrCanvas: "#FFFFFF",

    // --- Legacy compat aliases ---
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

  typography: {
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
  },

  radius: {
    chip: 6,
    button: 10,
    card: 14,
    scene: 16,
    qr: 16,
    tabBar: 20,
    inner: 10,
  },

  spacing: {
    screenHorizontal: 20,
    screenVertical: 24,
    sectionGap: 14,
    cardPadding: 20,
    scenePadding: 24,
  },
} as const;

// ---------------------------------------------------------------------------
// Shadow styles — no glow, just subtle depth
// ---------------------------------------------------------------------------
export const surfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 16px 32px rgba(0, 0, 0, 0.42)",
};

export const interactiveSurfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.32)",
};

export const sceneShadowStyle: ViewStyle = {
  boxShadow: "0px 18px 36px rgba(0, 0, 0, 0.44)",
};

// Lime border highlight (for active / hero elements)
export const limeBorderStyle: ViewStyle = {
  borderColor: "rgba(200, 255, 71, 0.18)",
  borderWidth: 1,
};

// Neutral border highlight kept for legacy consumers.
export const indigoGlowStyle: ViewStyle = {
  borderColor: "rgba(255, 255, 255, 0.06)",
  borderWidth: 1,
};
