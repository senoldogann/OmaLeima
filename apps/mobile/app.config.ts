import type { ConfigContext, ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  "7d5a41df-c149-4472-bfb4-136809cacd5f";

const createExpoConfig = (_context: ConfigContext): ExpoConfig => ({
  name: "OmaLeima",
  slug: "omaleima-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "omaleima",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "fi.omaleima.mobile",
    icon: "./assets/expo.icon",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "OmaLeima uses the camera to scan student QR codes during events.",
    },
  },
  android: {
    package: "fi.omaleima.mobile",
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: "#050705",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#050705",
        android: {
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      },
    ],
    [
      "expo-web-browser",
      {
        experimentalLauncherActivity: false,
      },
    ],
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-image-picker",
      {
        photosPermission: "OmaLeima uses your photos so venues can add a logo and cover image to their scanner profile.",
        cameraPermission: "OmaLeima uses the camera to scan student QR codes during events.",
        microphonePermission: false,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow OmaLeima to access the camera for QR scanning.",
        barcodeScannerEnabled: true,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow OmaLeima to attach this scanner location to leima scans for event-day fraud review.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
  },
});

export default createExpoConfig;
