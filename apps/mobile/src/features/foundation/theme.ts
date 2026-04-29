import type { ViewStyle } from "react-native";

// ---------------------------------------------------------------------------
// STARK Design System
// Flat, opaque, typography-first. No glass, no blur, no halos.
// Color as the primary communicator of hierarchy and state.
// ---------------------------------------------------------------------------

export const mobileTheme = {
  colors: {
    // --- Base surfaces (solid, opaque) ---
    screenBase: "#08090E",
    surfaceL1: "#0F1117",
    surfaceL2: "#161820",
    surfaceL3: "#1D202B",
    surfaceL4: "#242733",

    // --- Borders ---
    borderDefault: "rgba(255, 255, 255, 0.04)",
    borderSubtle: "rgba(255, 255, 255, 0.025)",
    borderStrong: "rgba(255, 255, 255, 0.08)",
    borderMuted: "rgba(255, 255, 255, 0.06)",

    // --- Accent: Lime (hero, stamps, positive, active) ---
    lime: "#C8FF47",
    limeStrong: "#AEFF00",
    limeDim: "#8FCC1A",
    limeSurface: "rgba(200, 255, 71, 0.08)",
    limeBorder: "rgba(200, 255, 71, 0.22)",

    // --- Accent: Pink (events, party energy, danger-adjacent) ---
    pink: "#FF7A9C",
    pinkStrong: "#FF5C84",
    pinkDim: "#B85C74",
    pinkSurface: "rgba(255, 122, 156, 0.06)",
    pinkBorder: "rgba(255, 122, 156, 0.14)",

    // --- Accent: Cyan (QR, active, info) ---
    cyan: "#B7F3FF",
    cyanStrong: "#8EEBFF",
    cyanDim: "#67B8C8",
    cyanSurface: "rgba(183, 243, 255, 0.05)",
    cyanBorder: "rgba(183, 243, 255, 0.14)",

    // --- Accent: Amber (warning, gold, rewards) ---
    amber: "#FFB830",
    amberStrong: "#F59E0B",
    amberSurface: "rgba(255, 184, 48, 0.06)",
    amberBorder: "rgba(255, 184, 48, 0.14)",

    // --- Semantic ---
    success: "#2EDB8A",
    successSurface: "rgba(46, 219, 138, 0.06)",
    successBorder: "rgba(46, 219, 138, 0.14)",

    danger: "#FF4444",
    dangerSurface: "rgba(255, 68, 68, 0.06)",
    dangerBorder: "rgba(255, 68, 68, 0.14)",

    warning: "#FFB830",
    warningSurface: "rgba(255, 184, 48, 0.06)",
    warningBorder: "rgba(255, 184, 48, 0.14)",

    // --- Typography ---
    textPrimary: "#F0F2F6",
    textSecondary: "#9BA3B2",
    textMuted: "#5C6477",
    textDim: "#3A3F4E",

    // --- QR (always white canvas) ---
    qrCanvas: "#FFFFFF",

    // --- Legacy compat aliases ---
    accentBlue: "#47DCFF",
    accentIndigo: "#8B80FF",
    accentViolet: "#B380FF",
    accentMint: "#2EDB8A",
    accentGold: "#FFB830",
    accentAmber: "#FFB830",
    accentRose: "#FF4776",
    accentCoral: "#FF7047",
    chromeTint: "rgba(71, 220, 255, 0.08)",
    chromeTintWarm: "rgba(255, 184, 48, 0.08)",
    chromeTintRose: "rgba(255, 71, 118, 0.08)",
    chromeTintIndigo: "rgba(200, 255, 71, 0.08)",
    chromeTintViolet: "rgba(179, 128, 255, 0.08)",
    cardBackground: "#0F1117",
    cardBackgroundStrong: "#161820",
    cardBackgroundSoft: "rgba(255, 255, 255, 0.03)",
    cardBorder: "rgba(255, 255, 255, 0.07)",
    cardBorderStrong: "rgba(255, 255, 255, 0.14)",
    cardHighlight: "rgba(255, 255, 255, 0.04)",
    actionBlue: "#47DCFF",
    actionBlueStrong: "#00C8F0",
    actionNeutral: "rgba(255, 255, 255, 0.05)",
    actionNeutralBorder: "rgba(255, 255, 255, 0.00)",
    actionPrimary: "#C8FF47",
    actionPrimaryStrong: "#AEFF00",
    successSurfaceLegacy: "rgba(46, 219, 138, 0.08)",
    progressTrack: "rgba(255, 255, 255, 0.06)",
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
    screenElevated: "#0F1117",
    screenContrast: "#161820",
    screenHighlight: "#1D202B",
    textSoft: "#5C6477",
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
  boxShadow: "0px 10px 28px rgba(0, 0, 0, 0.32)",
};

export const interactiveSurfaceShadowStyle: ViewStyle = {
  boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.22)",
};

export const sceneShadowStyle: ViewStyle = {
  boxShadow: "0px 14px 34px rgba(0, 0, 0, 0.34)",
};

// Lime border highlight (for active / hero elements)
export const limeBorderStyle: ViewStyle = {
  borderColor: "rgba(200, 255, 71, 0.30)",
  borderWidth: 1,
};

// Cyan border highlight (for QR / live state)
export const indigoGlowStyle: ViewStyle = {
  borderColor: "rgba(71, 220, 255, 0.30)",
  borderWidth: 1,
};
