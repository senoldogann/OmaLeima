import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(mobileRoot, "..", "..");

const packageJsonPath = path.join(mobileRoot, "package.json");
const appConfigPath = path.join(mobileRoot, "app.config.ts");
const easJsonPath = path.join(mobileRoot, "eas.json");
const envLocalPath = path.join(mobileRoot, ".env.local");
const androidManifestPath = path.join(mobileRoot, "android", "app", "src", "main", "AndroidManifest.xml");
const androidNotificationIconPath = path.join(mobileRoot, "android", "app", "src", "main", "res", "drawable-xxxhdpi", "notification_icon.png");
const iosPrivacyManifestPath = path.join(mobileRoot, "ios", "OmaLeima", "PrivacyInfo.xcprivacy");
const iosInfoPlistPath = path.join(mobileRoot, "ios", "OmaLeima", "Info.plist");
const iosPodfileLockPath = path.join(mobileRoot, "ios", "Podfile.lock");
const iosStaleExpoIconPath = path.join(mobileRoot, "ios", "OmaLeima", "expo.icon");
const iosXcodeProjectPath = path.join(mobileRoot, "ios", "OmaLeima.xcodeproj", "project.pbxproj");
const readmePath = path.join(mobileRoot, "README.md");
const testingDocPath = path.join(repoRoot, "docs", "TESTING.md");
const launchRunbookPath = path.join(repoRoot, "docs", "LAUNCH_RUNBOOK.md");
const rootReadmePath = path.join(repoRoot, "README.md");
const publicLegalContentPath = path.join(repoRoot, "apps", "admin", "src", "features", "public-site", "legal-content.ts");
const legalLinksCardPath = path.join(mobileRoot, "src", "features", "legal", "legal-links-card.tsx");
const supportRequestSheetPath = path.join(mobileRoot, "src", "features", "support", "components", "support-request-sheet.tsx");
const authLibPath = path.join(mobileRoot, "src", "lib", "auth.ts");
const loginScreenPath = path.join(mobileRoot, "src", "app", "auth", "login.tsx");
const appleSignInButtonPath = path.join(mobileRoot, "src", "features", "auth", "components", "apple-sign-in-button.tsx");
const scanFeedbackPath = path.join(mobileRoot, "src", "features", "foundation", "safe-scan-feedback.ts");
const releaseGatePath = path.join(mobileRoot, "src", "features", "release", "release-gate.ts");
const releaseGateProviderPath = path.join(mobileRoot, "src", "features", "release", "release-gate-provider.tsx");
const appProvidersPath = path.join(mobileRoot, "src", "providers", "app-providers.tsx");
const releaseRequirementMigrationPath = path.join(repoRoot, "supabase", "migrations", "20260508093000_mobile_release_requirements.sql");
const productionTestChecklistPath = path.join(repoRoot, "docs", "PRODUCTION_TEST_CHECKLIST.md");

const readUtf8Async = async (filePath) => fs.readFile(filePath, "utf8");
const pathExistsAsync = async (filePath) =>
  fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
const readOptionalUtf8Async = async (filePath) => {
  const exists = await pathExistsAsync(filePath);

  return exists ? readUtf8Async(filePath) : "";
};

const fail = (code, details) => {
  console.error(code);
  details.forEach((detail) => {
    console.error(`- ${detail}`);
  });
  process.exit(1);
};

const hasSemverVersion = (source) => /version:\s*"(\d+)\.(\d+)\.(\d+)"/.test(source);

const requiredEasEnvNames = [
  "EXPO_PUBLIC_EAS_PROJECT_ID",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
];
const requiredEasEnvironments = ["development", "preview", "production"];
const nativeReleaseMode = (process.env.OMALEIMA_NATIVE_RELEASE_MODE ?? "eas").trim().toLowerCase();
const localNativeReleaseMode = nativeReleaseMode === "local";
const storeAssetPaths = [
  "assets/images/icon.png",
  "assets/images/android-icon-foreground.png",
  "assets/images/android-icon-background.png",
  "assets/images/android-icon-monochrome.png",
  "assets/images/notification-icon.png",
  "assets/images/favicon.png",
  "assets/images/splash-icon.png",
];
const requiredIosPrivacyCollectedDataTypeMarkers = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypePreciseLocation",
  "NSPrivacyCollectedDataTypePhotosorVideos",
  "NSPrivacyCollectedDataTypeCustomerSupport",
  "NSPrivacyCollectedDataTypeProductInteraction",
];
const requiredNativeShareDependencies = [
  "expo-media-library",
  "expo-sharing",
  "react-native-view-shot",
];
const requiredNativeFeedbackDependencies = [
  "expo-audio",
  "expo-haptics",
];
const requiredNativeAppleSignInDependencies = [
  "expo-apple-authentication",
];
const requiredStoreIconDimensions = {
  "assets/store-icons/android/mipmap-hdpi-72.png": [72, 72],
  "assets/store-icons/android/mipmap-mdpi-48.png": [48, 48],
  "assets/store-icons/android/mipmap-xhdpi-96.png": [96, 96],
  "assets/store-icons/android/mipmap-xxhdpi-144.png": [144, 144],
  "assets/store-icons/android/mipmap-xxxhdpi-192.png": [192, 192],
  "assets/store-icons/android/play-store-512.png": [512, 512],
  "assets/store-icons/apple/app-store-1024.png": [1024, 1024],
  "assets/store-icons/apple/ipad-app-76@1x.png": [76, 76],
  "assets/store-icons/apple/ipad-app-76@2x.png": [152, 152],
  "assets/store-icons/apple/ipad-notification-20@1x.png": [20, 20],
  "assets/store-icons/apple/ipad-notification-20@2x.png": [40, 40],
  "assets/store-icons/apple/ipad-pro-app-83.5@2x.png": [167, 167],
  "assets/store-icons/apple/ipad-settings-29@1x.png": [29, 29],
  "assets/store-icons/apple/ipad-settings-29@2x.png": [58, 58],
  "assets/store-icons/apple/ipad-spotlight-40@1x.png": [40, 40],
  "assets/store-icons/apple/ipad-spotlight-40@2x.png": [80, 80],
  "assets/store-icons/apple/iphone-app-60@2x.png": [120, 120],
  "assets/store-icons/apple/iphone-app-60@3x.png": [180, 180],
  "assets/store-icons/apple/iphone-notification-20@2x.png": [40, 40],
  "assets/store-icons/apple/iphone-notification-20@3x.png": [60, 60],
  "assets/store-icons/apple/iphone-settings-29@2x.png": [58, 58],
  "assets/store-icons/apple/iphone-settings-29@3x.png": [87, 87],
  "assets/store-icons/apple/iphone-spotlight-40@2x.png": [80, 80],
  "assets/store-icons/apple/iphone-spotlight-40@3x.png": [120, 120],
};
const hostedLoginSlideCopyFields = [
  "eyebrow_fi",
  "title_fi",
  "body_fi",
  "eyebrow_en",
  "title_en",
  "body_en",
];
const hostedLoginSlidePlaceholderPatterns = [
  /^\s*test\s*$/i,
  /^\s*todo\s*$/i,
  /^\s*placeholder\s*$/i,
  /^\s*lorem(\s+ipsum)?\s*$/i,
  /^\s*asdf\s*$/i,
  /\blife is good when you mute\b/i,
];

const parseLocalEnv = (source) =>
  Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) {
          return null;
        }

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");

        return key.length > 0 ? [key, value] : null;
      })
      .filter((entry) => entry !== null)
  );

const readMobilePublicEnvAsync = async () => {
  const envLocalSource = await readOptionalUtf8Async(envLocalPath);
  const localEnv = parseLocalEnv(envLocalSource);

  return {
    publishableKey:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      localEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "",
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      localEnv.EXPO_PUBLIC_SUPABASE_URL ??
      "",
  };
};

const hasPlaceholderCopy = (value) =>
  hostedLoginSlidePlaceholderPatterns.some((pattern) => pattern.test(value));

const readHostedLoginSlidesAsync = async (mobilePublicEnv) => {
  if (!mobilePublicEnv.supabaseUrl.startsWith("https://") || mobilePublicEnv.publishableKey.length === 0) {
    return {
      details: ["missing-public-supabase-env"],
      ready: false,
    };
  }

  const requestUrl = new URL(`${mobilePublicEnv.supabaseUrl.replace(/\/$/, "")}/rest/v1/login_slides`);
  requestUrl.searchParams.set(
    "select",
    [
      "id",
      "image_url",
      "eyebrow_fi",
      "title_fi",
      "body_fi",
      "eyebrow_en",
      "title_en",
      "body_en",
    ].join(",")
  );
  requestUrl.searchParams.set("is_active", "eq.true");
  requestUrl.searchParams.set("order", "sort_order.asc,created_at.asc");
  requestUrl.searchParams.set("limit", "8");

  const response = await fetch(requestUrl, {
    headers: {
      apikey: mobilePublicEnv.publishableKey,
      Authorization: `Bearer ${mobilePublicEnv.publishableKey}`,
    },
  });

  if (!response.ok) {
    return {
      details: [`hosted-login-slides-http-${response.status}`],
      ready: false,
    };
  }

  const rows = await response.json();

  if (!Array.isArray(rows)) {
    return {
      details: ["hosted-login-slides-invalid-response"],
      ready: false,
    };
  }

  const invalidFields = rows.flatMap((row) => {
    const rowId = typeof row.id === "string" && row.id.length > 0 ? row.id : "unknown";
    const localizedCopyFailures = hostedLoginSlideCopyFields
      .filter((fieldName) => typeof row[fieldName] !== "string" || row[fieldName].trim().length < 4 || hasPlaceholderCopy(row[fieldName]))
      .map((fieldName) => `${rowId}:${fieldName}`);
    const imageUrlFailures =
      typeof row.image_url === "string" && row.image_url.startsWith("https://")
        ? []
        : [`${rowId}:image_url`];

    return [...localizedCopyFailures, ...imageUrlFailures];
  });

  return {
    details: invalidFields,
    ready: invalidFields.length === 0,
  };
};

const readOverrideEasEnvState = () => {
  const rawValue = process.env.MOBILE_STORE_EAS_ENV_LIST_JSON;

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  return JSON.parse(rawValue);
};

const parseEasEnvNames = (output) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("Environment:"))
    .map((line) => line.split("=")[0]?.trim())
    .filter((line) => typeof line === "string" && line.length > 0);

const readPngDimensions = (relativePath) => {
  const command = spawnSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", path.join(mobileRoot, relativePath)],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (command.status !== 0) {
    return null;
  }

  const widthMatch = command.stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = command.stdout.match(/pixelHeight:\s*(\d+)/);

  if (widthMatch === null || heightMatch === null) {
    return null;
  }

  return [Number(widthMatch[1]), Number(heightMatch[1])];
};

const readRemoteEasEnvState = () => {
  const overrideState = readOverrideEasEnvState();

  if (overrideState !== null) {
    return overrideState;
  }

  return Object.fromEntries(
    requiredEasEnvironments.map((environmentName) => {
      const command = spawnSync(
        "npx",
        ["eas-cli", "env:list", environmentName, "--scope", "project", "--format", "short"],
        {
          cwd: mobileRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      if (command.status !== 0) {
        const stderr = command.stderr.trim();
        const stdout = command.stdout.trim();
        const errorOutput = stderr.length > 0 ? stderr : stdout;

        throw new Error(
          errorOutput.length > 0
            ? `Failed to read Expo EAS env names for ${environmentName}. ${errorOutput}`
            : `Failed to read Expo EAS env names for ${environmentName}.`
        );
      }

      return [environmentName, parseEasEnvNames(command.stdout)];
    })
  );
};

const main = async () => {
  const [
    packageJsonSource,
    appConfigSource,
    easJsonSource,
    androidManifestSource,
    androidNotificationIconExists,
    iosPrivacyManifestSource,
    iosInfoPlistSource,
    iosPodfileLockSource,
    iosStaleExpoIconExists,
    iosXcodeProjectSource,
    readmeSource,
    testingDocSource,
    launchRunbookSource,
    rootReadmeSource,
    publicLegalContentSource,
    legalLinksCardSource,
    supportRequestSheetSource,
    authLibSource,
    loginScreenSource,
    appleSignInButtonSource,
    scanFeedbackSource,
    releaseGateSource,
    releaseGateProviderSource,
    appProvidersSource,
    releaseRequirementMigrationSource,
    productionTestChecklistSource,
  ] =
    await Promise.all([
      readUtf8Async(packageJsonPath),
      readUtf8Async(appConfigPath),
      readUtf8Async(easJsonPath),
      readOptionalUtf8Async(androidManifestPath),
      pathExistsAsync(androidNotificationIconPath),
      readOptionalUtf8Async(iosPrivacyManifestPath),
      readOptionalUtf8Async(iosInfoPlistPath),
      readOptionalUtf8Async(iosPodfileLockPath),
      pathExistsAsync(iosStaleExpoIconPath),
      readOptionalUtf8Async(iosXcodeProjectPath),
      readUtf8Async(readmePath),
      readUtf8Async(testingDocPath),
      readUtf8Async(launchRunbookPath),
      readUtf8Async(rootReadmePath),
      readUtf8Async(publicLegalContentPath),
      readUtf8Async(legalLinksCardPath),
      readUtf8Async(supportRequestSheetPath),
      readUtf8Async(authLibPath),
      readUtf8Async(loginScreenPath),
      readUtf8Async(appleSignInButtonPath),
      readUtf8Async(scanFeedbackPath),
      readUtf8Async(releaseGatePath),
      readUtf8Async(releaseGateProviderPath),
      readUtf8Async(appProvidersPath),
      readUtf8Async(releaseRequirementMigrationPath),
      readUtf8Async(productionTestChecklistPath),
    ]);

  const packageJson = JSON.parse(packageJsonSource);
  const easJson = JSON.parse(easJsonSource);
  const mobilePublicEnv = await readMobilePublicEnvAsync();
  const hostedLoginSlidesState = await readHostedLoginSlidesAsync(mobilePublicEnv);
  const remoteEasEnvState = localNativeReleaseMode
    ? Object.fromEntries(requiredEasEnvironments.map((environmentName) => [environmentName, requiredEasEnvNames]))
    : readRemoteEasEnvState();
  const storeAssetExists = await Promise.all(storeAssetPaths.map((relativePath) => pathExistsAsync(path.join(mobileRoot, relativePath))));
  const storeIconDimensionFailures = Object.entries(requiredStoreIconDimensions).flatMap(([relativePath, dimensions]) => {
    const actualDimensions = readPngDimensions(relativePath);

    if (actualDimensions === null) {
      return [`${relativePath}:missing-or-unreadable`];
    }

    const [expectedWidth, expectedHeight] = dimensions;
    const [actualWidth, actualHeight] = actualDimensions;

    return actualWidth === expectedWidth && actualHeight === expectedHeight
      ? []
      : [`${relativePath}:expected-${expectedWidth}x${expectedHeight}:actual-${actualWidth}x${actualHeight}`];
  });

  const packageScriptPresent = packageJson.scripts?.["audit:store-release-readiness"] === "node scripts/audit-store-release-readiness.mjs";
  const appIdentityReady =
    appConfigSource.includes('name: "OmaLeima"') &&
    appConfigSource.includes('slug: "omaleima-mobile"') &&
    hasSemverVersion(appConfigSource) &&
    appConfigSource.includes('scheme: "omaleima"') &&
    appConfigSource.includes('bundleIdentifier: "fi.omaleima.mobile"') &&
    appConfigSource.includes('package: "fi.omaleima.mobile"');
  const buildAssetsReady =
    appConfigSource.includes('icon: "./assets/images/icon.png"') &&
    !appConfigSource.includes('icon: "./assets/expo.icon"') &&
    appConfigSource.includes('favicon: "./assets/images/favicon.png"') &&
    appConfigSource.includes('image: "./assets/images/splash-icon.png"') &&
    appConfigSource.includes('foregroundImage: "./assets/images/android-icon-foreground.png"') &&
    appConfigSource.includes('backgroundImage: "./assets/images/android-icon-background.png"') &&
    appConfigSource.includes('monochromeImage: "./assets/images/android-icon-monochrome.png"') &&
    appConfigSource.includes('icon: "./assets/images/notification-icon.png"') &&
    storeAssetExists.every(Boolean);
  const storeIconDimensionsReady = storeIconDimensionFailures.length === 0;
  const generatedBrandingAssetsAligned =
    !iosStaleExpoIconExists &&
    !iosXcodeProjectSource.includes("expo.icon") &&
    !iosXcodeProjectSource.includes("ASSETCATALOG_COMPILER_APPICON_NAME = expo;") &&
    (
      androidManifestSource.length === 0 ||
      (
        androidManifestSource.includes('com.google.firebase.messaging.default_notification_icon') &&
        androidManifestSource.includes('@drawable/notification_icon') &&
        androidNotificationIconExists
      )
    );
  const nativePolicyReady =
    appConfigSource.includes("expo-notifications") &&
    appConfigSource.includes("expo-camera") &&
    appConfigSource.includes('ITSAppUsesNonExemptEncryption: false') &&
    appConfigSource.includes('allowBackup: false') &&
    appConfigSource.includes('"android.permission.FOREGROUND_SERVICE"') &&
    appConfigSource.includes('"android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"') &&
    appConfigSource.includes('"android.permission.MODIFY_AUDIO_SETTINGS"') &&
    appConfigSource.includes('"android.permission.READ_MEDIA_AUDIO"') &&
    appConfigSource.includes('"android.permission.RECORD_AUDIO"') &&
    appConfigSource.includes('"android.permission.SYSTEM_ALERT_WINDOW"') &&
    appConfigSource.includes("Allow OmaLeima to access the camera for QR scanning.") &&
    appConfigSource.includes("projectId: easProjectId");
  const staleBuildGateReady =
    appConfigSource.includes('buildNumber: "1"') &&
    appConfigSource.includes("versionCode: 1") &&
    appConfigSource.includes("androidStoreUrl") &&
    appConfigSource.includes("iosStoreUrl") &&
    releaseGateSource.includes("mobile_release_requirements") &&
    releaseGateSource.includes("ExecutionEnvironment.Standalone") &&
    releaseGateSource.includes("compareSemanticVersions") &&
    releaseGateProviderSource.includes("ReleaseGateProvider") &&
    releaseGateProviderSource.includes("Could not verify app version") &&
    releaseGateProviderSource.includes("Update required") &&
    appProvidersSource.includes("<ReleaseGateProvider>") &&
    releaseRequirementMigrationSource.includes("create table if not exists public.mobile_release_requirements") &&
    releaseRequirementMigrationSource.includes("public can read mobile release requirements") &&
    productionTestChecklistSource.includes("stale") &&
    productionTestChecklistSource.includes("minimum supported version");
  const nativeShareSourceReady =
    requiredNativeShareDependencies.every((dependencyName) => typeof packageJson.dependencies?.[dependencyName] === "string") &&
    appConfigSource.includes('"expo-sharing"') &&
    appConfigSource.includes('"expo-media-library"') &&
    appConfigSource.includes("NSPhotoLibraryAddUsageDescription") &&
    appConfigSource.includes("savePhotosPermission") &&
    appConfigSource.includes("leima pass share card");
  const nativeFeedbackSourceUsesSafeAudioLoad =
    scanFeedbackSource.includes('requireOptionalNativeModule("ExpoAudio")') &&
    scanFeedbackSource.includes('require("expo-audio")') &&
    scanFeedbackSource.includes("isExpoAudioNativeModuleAvailable") &&
    scanFeedbackSource.includes("catch(() => null)") &&
    !scanFeedbackSource.includes('import("expo-audio")') &&
    !scanFeedbackSource.includes('from "expo-audio"') &&
    !scanFeedbackSource.includes("from 'expo-audio'");
  const nativeFeedbackSourceReady =
    requiredNativeFeedbackDependencies.every((dependencyName) => typeof packageJson.dependencies?.[dependencyName] === "string") &&
    appConfigSource.includes('"expo-audio"') &&
    appConfigSource.includes("enableBackgroundPlayback: false") &&
    appConfigSource.includes("enableBackgroundRecording: false") &&
    appConfigSource.includes("microphonePermission: false") &&
    appConfigSource.includes("recordAudioAndroid: false") &&
    typeof packageJson.dependencies?.["expo-haptics"] === "string" &&
    nativeFeedbackSourceUsesSafeAudioLoad &&
    scanFeedbackSource.includes("scan-success.wav") &&
    scanFeedbackSource.includes("scan-warning.wav") &&
    scanFeedbackSource.includes("scan-error.wav");
  const nativeAppleSignInSourceReady =
    requiredNativeAppleSignInDependencies.every((dependencyName) => typeof packageJson.dependencies?.[dependencyName] === "string") &&
    appConfigSource.includes("usesAppleSignIn: true") &&
    appConfigSource.includes('"expo-apple-authentication"') &&
    authLibSource.includes('provider: "apple"') &&
    authLibSource.includes("signInWithIdToken") &&
    authLibSource.includes("AppleAuthentication.signInAsync") &&
    appleSignInButtonSource.includes("copy.auth.appleButton") &&
    appleSignInButtonSource.includes("signInWithAppleAsync") &&
    appleSignInButtonSource.includes("Platform.OS !== \"ios\"") &&
    loginScreenSource.includes("<AppleSignInButton />");
  const iosLocationAlwaysPermissionHygieneReady =
    appConfigSource.includes("locationAlwaysAndWhenInUsePermission: false") &&
    appConfigSource.includes("locationAlwaysPermission: false") &&
    appConfigSource.includes("isIosBackgroundLocationEnabled: false") &&
    (
      iosInfoPlistSource.length === 0 ||
      (
        !iosInfoPlistSource.includes("NSLocationAlwaysAndWhenInUseUsageDescription") &&
        !iosInfoPlistSource.includes("NSLocationAlwaysUsageDescription") &&
        !iosInfoPlistSource.includes("UIBackgroundModes")
      )
    );
  const iosDevClientLocalNetworkHygieneReady =
    appConfigSource.includes('"./plugins/with-store-info-plist-hygiene"') &&
    (
      iosInfoPlistSource.length === 0 ||
      (
        !iosInfoPlistSource.includes("NSAllowsLocalNetworking") &&
        !iosInfoPlistSource.includes("NSBonjourServices") &&
        !iosInfoPlistSource.includes("NSLocalNetworkUsageDescription") &&
        !iosInfoPlistSource.includes("Expo Dev Launcher")
      )
    );
  const generatedAndroidManifestAligned =
    androidManifestSource.length === 0 ||
    (
      androidManifestSource.includes('android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"') &&
      androidManifestSource.includes('android.permission.RECORD_AUDIO" tools:node="remove"') &&
      androidManifestSource.includes('android.permission.READ_MEDIA_AUDIO" tools:node="remove"') &&
      androidManifestSource.includes('android.permission.MODIFY_AUDIO_SETTINGS" tools:node="remove"') &&
      androidManifestSource.includes('android.permission.FOREGROUND_SERVICE" tools:node="remove"') &&
      androidManifestSource.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" tools:node="remove"') &&
      androidManifestSource.includes('android:allowBackup="false"') &&
      !androidManifestSource.includes('android.permission.SYSTEM_ALERT_WINDOW"/>') &&
      !androidManifestSource.includes('android.permission.RECORD_AUDIO"/>') &&
      !androidManifestSource.includes('android.permission.READ_MEDIA_AUDIO"/>') &&
      !androidManifestSource.includes('android.permission.MODIFY_AUDIO_SETTINGS"/>') &&
      !androidManifestSource.includes('android.permission.FOREGROUND_SERVICE"/>') &&
      !androidManifestSource.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>') &&
      !androidManifestSource.includes('android:allowBackup="true"')
    );
  const androidStorePermissionHygieneReady =
    appConfigSource.includes('allowBackup: false') &&
    appConfigSource.includes('"android.permission.FOREGROUND_SERVICE"') &&
    appConfigSource.includes('"android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"') &&
    appConfigSource.includes('"android.permission.MODIFY_AUDIO_SETTINGS"') &&
    appConfigSource.includes('"android.permission.READ_MEDIA_AUDIO"') &&
    appConfigSource.includes('"android.permission.RECORD_AUDIO"') &&
    appConfigSource.includes('"android.permission.SYSTEM_ALERT_WINDOW"') &&
    generatedAndroidManifestAligned;
  const iosPrivacyManifestSourceOfTruthReady =
    appConfigSource.includes("privacyManifests") &&
    appConfigSource.includes("NSPrivacyTracking: false") &&
    requiredIosPrivacyCollectedDataTypeMarkers.every((marker) => appConfigSource.includes(marker)) &&
    appConfigSource.includes("NSPrivacyCollectedDataTypePurposeAppFunctionality") &&
    !appConfigSource.includes("NSPrivacyCollectedDataTypeTracking: true");
  const generatedIosPrivacyManifestAligned =
    iosPrivacyManifestSource.length === 0 ||
    (
      iosPrivacyManifestSource.includes("NSPrivacyTracking") &&
      iosPrivacyManifestSource.includes("<false/>") &&
      requiredIosPrivacyCollectedDataTypeMarkers.every((marker) => iosPrivacyManifestSource.includes(marker)) &&
      iosPrivacyManifestSource.includes("NSPrivacyCollectedDataTypePurposeAppFunctionality") &&
      !iosPrivacyManifestSource.includes("NSPrivacyCollectedDataTypeTracking</key>\n\t<true/>")
    );
  const generatedIosMicrophoneHygieneReady =
    iosInfoPlistSource.length === 0 ||
    !iosInfoPlistSource.includes("NSMicrophoneUsageDescription");
  const generatedIosPodsAligned =
    iosPodfileLockSource.length === 0 ||
    (
      iosPodfileLockSource.includes('ExpoCrypto (from `../node_modules/expo-crypto/ios`)') &&
      iosPodfileLockSource.includes(':path: "../node_modules/expo-crypto/ios"') &&
      !iosPodfileLockSource.includes("expo-auth-session/node_modules/expo-crypto")
    );
  const generatedNativeShareModulesAligned =
    (iosInfoPlistSource.length === 0 || iosInfoPlistSource.includes("NSPhotoLibraryAddUsageDescription")) &&
    (
      iosPodfileLockSource.length === 0 ||
      (
        iosPodfileLockSource.includes("ExpoMediaLibrary") &&
        iosPodfileLockSource.includes("ExpoSharing") &&
        iosPodfileLockSource.includes("react-native-view-shot")
      )
    );
  const generatedNativeFeedbackModulesAligned =
    iosPodfileLockSource.length === 0 ||
    (
      iosPodfileLockSource.includes("ExpoAudio") &&
      iosPodfileLockSource.includes("ExpoHaptics")
    );
  const iosPrivacyManifestReady =
    iosPrivacyManifestSourceOfTruthReady &&
    generatedIosPrivacyManifestAligned &&
    generatedIosPodsAligned &&
    generatedIosMicrophoneHygieneReady;
  const easCliReady =
    easJson.cli?.appVersionSource === "remote" &&
    typeof easJson.cli?.version === "string" &&
    easJson.build?.development?.environment === "development" &&
    easJson.build?.development?.developmentClient === true &&
    easJson.build?.development?.distribution === "internal" &&
    easJson.build?.preview?.environment === "preview" &&
    easJson.build?.preview?.distribution === "internal" &&
    easJson.build?.production?.environment === "production" &&
    easJson.build?.production?.autoIncrement === true;
  const nativeReleasePathReady = localNativeReleaseMode || easCliReady;
  const remoteEasEnvReady = requiredEasEnvironments.every((environmentName) => {
    const envNames = Array.isArray(remoteEasEnvState[environmentName]) ? remoteEasEnvState[environmentName] : [];

    return requiredEasEnvNames.every((requiredName) => envNames.includes(requiredName));
  });

  const normalizedMobileReadme = readmeSource.toLowerCase();
  const normalizedTestingDoc = testingDocSource.toLowerCase();
  const normalizedLaunchRunbook = launchRunbookSource.toLowerCase();
  const normalizedRootReadme = rootReadmeSource.toLowerCase();
  const normalizedPublicLegalContent = publicLegalContentSource.toLowerCase();
  const normalizedLegalLinksCard = legalLinksCardSource.toLowerCase();
  const normalizedSupportRequestSheet = supportRequestSheetSource.toLowerCase();
  const normalizedProductionTestChecklist = productionTestChecklistSource.toLowerCase();

  const docsAligned =
    normalizedMobileReadme.includes("audit:store-release-readiness") &&
    (normalizedMobileReadme.includes("expo eas cli auth") || normalizedMobileReadme.includes("local xcode/gradle native release")) &&
    normalizedTestingDoc.includes("mobile store/public-launch readiness") &&
    normalizedTestingDoc.includes("hosted active mobile login slides") &&
    normalizedTestingDoc.includes("app store connect") &&
    normalizedTestingDoc.includes("google play console state") &&
    normalizedTestingDoc.includes("sign in with apple") &&
    normalizedLaunchRunbook.includes("store/public launch owner checklist") &&
    normalizedLaunchRunbook.includes("app store connect") &&
    normalizedLaunchRunbook.includes("google play console") &&
    normalizedLaunchRunbook.includes("hosted active mobile login slides") &&
    (normalizedLaunchRunbook.includes("expo eas environment variables") || normalizedLaunchRunbook.includes("local xcode/gradle release build")) &&
    normalizedLaunchRunbook.includes("sign in with apple") &&
    normalizedRootReadme.includes("qa:mobile-store-release-readiness");

  const mobilePrivacyCoverageReady =
    normalizedPublicLegalContent.includes("mobile app") &&
    normalizedPublicLegalContent.includes("account deletion") &&
    normalizedPublicLegalContent.includes("qr token metadata") &&
    normalizedPublicLegalContent.includes("push notification tokens") &&
    normalizedPublicLegalContent.includes("scanner location proof");
  const inAppLegalLinksReady =
    normalizedLegalLinksCard.includes("https://omaleima.fi/privacy") &&
    normalizedLegalLinksCard.includes("https://omaleima.fi/terms") &&
    normalizedLegalLinksCard.includes("https://omaleima.fi/en/privacy") &&
    normalizedLegalLinksCard.includes("https://omaleima.fi/en/terms") &&
    normalizedLegalLinksCard.includes("privacy notice") &&
    normalizedLegalLinksCard.includes("terms of use");
  const inAppDeletionRequestReady =
    normalizedSupportRequestSheet.includes("request account and data deletion") &&
    normalizedSupportRequestSheet.includes("createaccountdeletionmessage") &&
    normalizedSupportRequestSheet.includes("retain some records");
  const webDeletionResourceReady =
    normalizedPublicLegalContent.includes("public web resource for omaleima account deletion") &&
    normalizedPublicLegalContent.includes("account deletion or data deletion request") &&
    normalizedPublicLegalContent.includes("email address used for omaleima");
  const mobileEdgeSecurityBoundaryReady =
    normalizedLaunchRunbook.includes("mobile edge security boundary") &&
    normalizedLaunchRunbook.includes("cloudflare waf protects the web app") &&
    normalizedLaunchRunbook.includes("direct supabase mobile traffic is not protected by cloudflare waf") &&
    normalizedLaunchRunbook.includes("media-staging") &&
    normalizedProductionTestChecklist.includes("mobile edge security boundary") &&
    normalizedProductionTestChecklist.includes("cloudflare web waf") &&
    normalizedProductionTestChecklist.includes("supabase auth/rls/edge functions/storage");
  const hostedMobileLoginSlidesReady = hostedLoginSlidesState.ready;

  if (
    !packageScriptPresent ||
    !appIdentityReady ||
    !buildAssetsReady ||
    !storeIconDimensionsReady ||
    !generatedBrandingAssetsAligned ||
    !nativePolicyReady ||
    !staleBuildGateReady ||
    !nativeShareSourceReady ||
    !nativeFeedbackSourceReady ||
    !nativeAppleSignInSourceReady ||
    !iosLocationAlwaysPermissionHygieneReady ||
    !iosDevClientLocalNetworkHygieneReady ||
    !androidStorePermissionHygieneReady ||
    !iosPrivacyManifestReady ||
    !generatedNativeShareModulesAligned ||
    !generatedNativeFeedbackModulesAligned ||
    !nativeReleasePathReady ||
    !remoteEasEnvReady ||
    !mobilePrivacyCoverageReady ||
    !inAppLegalLinksReady ||
    !inAppDeletionRequestReady ||
    !webDeletionResourceReady ||
    !mobileEdgeSecurityBoundaryReady ||
    !hostedMobileLoginSlidesReady ||
    !docsAligned
  ) {
    fail("mobile-store-release-readiness:failed", [
      `packageScriptPresent=${packageScriptPresent}`,
      `appIdentityReady=${appIdentityReady}`,
      `buildAssetsReady=${buildAssetsReady}`,
      `storeIconDimensionsReady=${storeIconDimensionsReady}`,
      `storeIconDimensionFailures=${storeIconDimensionFailures.join(",")}`,
      `generatedBrandingAssetsAligned=${generatedBrandingAssetsAligned}`,
      `nativePolicyReady=${nativePolicyReady}`,
      `staleBuildGateReady=${staleBuildGateReady}`,
      `nativeShareSourceReady=${nativeShareSourceReady}`,
      `nativeFeedbackSourceReady=${nativeFeedbackSourceReady}`,
      `nativeFeedbackSourceUsesSafeAudioLoad=${nativeFeedbackSourceUsesSafeAudioLoad}`,
      `nativeAppleSignInSourceReady=${nativeAppleSignInSourceReady}`,
      `iosLocationAlwaysPermissionHygieneReady=${iosLocationAlwaysPermissionHygieneReady}`,
      `iosDevClientLocalNetworkHygieneReady=${iosDevClientLocalNetworkHygieneReady}`,
      `androidStorePermissionHygieneReady=${androidStorePermissionHygieneReady}`,
      `iosPrivacyManifestSourceOfTruthReady=${iosPrivacyManifestSourceOfTruthReady}`,
      `generatedIosPrivacyManifestAligned=${generatedIosPrivacyManifestAligned}`,
      `generatedIosPodsAligned=${generatedIosPodsAligned}`,
      `generatedIosMicrophoneHygieneReady=${generatedIosMicrophoneHygieneReady}`,
      `generatedNativeShareModulesAligned=${generatedNativeShareModulesAligned}`,
      `generatedNativeFeedbackModulesAligned=${generatedNativeFeedbackModulesAligned}`,
      `iosPrivacyManifestReady=${iosPrivacyManifestReady}`,
      `nativeReleaseMode=${nativeReleaseMode}`,
      `nativeReleasePathReady=${nativeReleasePathReady}`,
      `easCliReady=${easCliReady}`,
      `remoteEasEnvReady=${remoteEasEnvReady}`,
      `mobilePrivacyCoverageReady=${mobilePrivacyCoverageReady}`,
      `inAppLegalLinksReady=${inAppLegalLinksReady}`,
      `inAppDeletionRequestReady=${inAppDeletionRequestReady}`,
      `webDeletionResourceReady=${webDeletionResourceReady}`,
      `mobileEdgeSecurityBoundaryReady=${mobileEdgeSecurityBoundaryReady}`,
      `hostedMobileLoginSlidesReady=${hostedMobileLoginSlidesReady}`,
      `hostedMobileLoginSlidesDetails=${hostedLoginSlidesState.details.join(",")}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "mobile-store-release-readiness:READY",
      "app-identity:present",
      "build-assets:present",
      "store-icon-dimensions:complete",
      "generated-branding-assets:aligned",
      "native-policy:present",
      "stale-build-gate:present",
      "native-share-modules:declared",
      "native-scan-feedback:declared",
      "ios-sign-in-with-apple:declared",
      "ios-location-always-permissions:blocked",
      "ios-dev-client-local-network:blocked",
      "android-sensitive-permissions:blocked",
      "ios-privacy-manifest:declared",
      "ios-generated-privacy-manifest:aligned",
      "ios-generated-pods:aligned",
      "ios-microphone-permission:blocked",
      "ios-generated-share-modules:aligned",
      "ios-generated-feedback-modules:aligned",
      "mobile-privacy-notice:present",
      "in-app-legal-links:present",
      "in-app-deletion-request:present",
      "web-deletion-resource:present",
      "mobile-edge-security-boundary:documented",
      "hosted-login-slides:clean",
      localNativeReleaseMode ? "native-release-mode:local" : "eas-build-environments:explicit",
      localNativeReleaseMode ? "eas-remote-envs:skipped-local-native-release" : "eas-remote-envs:present",
      "owner-store-tasks:documented",
      "next:prepare-app-store-connect-and-google-play-listings-when-broader-launch-starts",
    ].join("|")
  );
};

void main();
