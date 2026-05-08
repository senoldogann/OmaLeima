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
    buildNumber: "1",
    icon: "./assets/images/icon.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "OmaLeima uses the camera to scan student QR codes during events.",
      NSPhotoLibraryAddUsageDescription: "OmaLeima saves your leima pass share card to your photo library when you choose to save it.",
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["C617.1", "0A2A.1", "3B52.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
          NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
          NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
        },
      ],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhoneNumber",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhysicalAddress",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeDeviceID",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotosorVideos",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCustomerSupport",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeProductInteraction",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
      ],
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
    },
  },
  android: {
    package: "fi.omaleima.mobile",
    allowBackup: false,
    versionCode: 1,
    blockedPermissions: [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
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
    "expo-asset",
    [
      "expo-audio",
      {
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    "expo-font",
    "expo-image",
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
    "expo-sharing",
    [
      "expo-media-library",
      {
        photosPermission: "OmaLeima can save your leima pass share card to your photo library when you choose to save it.",
        savePhotosPermission: "OmaLeima can save your leima pass share card to your photo library when you choose to save it.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#C8FF47",
        defaultChannel: "default",
        icon: "./assets/images/notification-icon.png",
      },
    ],
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
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        locationWhenInUsePermission:
          "Allow OmaLeima to attach this scanner location to leima scans for event-day fraud review.",
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    "./plugins/with-store-info-plist-hygiene",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
    release: {
      androidStoreUrl: process.env.EXPO_PUBLIC_ANDROID_STORE_URL ?? "https://omaleima.fi",
      iosStoreUrl: process.env.EXPO_PUBLIC_IOS_STORE_URL ?? "https://omaleima.fi",
    },
  },
});

export default createExpoConfig;
