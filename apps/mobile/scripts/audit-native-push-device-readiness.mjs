import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const root = path.resolve(mobileRoot, "..", "..");
const sourceRoot = path.join(mobileRoot, "src");

const packageJsonPath = path.join(mobileRoot, "package.json");
const layoutPath = path.join(sourceRoot, "app", "_layout.tsx");
const providersPath = path.join(sourceRoot, "providers", "app-providers.tsx");
const diagnosticsPath = path.join(sourceRoot, "features", "push", "native-push-diagnostics.tsx");
const profilePath = path.join(sourceRoot, "app", "student", "profile.tsx");
const readmePath = path.join(mobileRoot, "README.md");
const testingDocPath = path.join(root, "docs", "TESTING.md");
const masterPlanPath = path.join(root, "LEIMA_APP_MASTER_PLAN.md");

const readUtf8Async = async (filePath) => fs.readFile(filePath, "utf8");

const fail = (code, details) => {
  console.error(code);
  details.forEach((detail) => {
    console.error(`- ${detail}`);
  });
  process.exit(1);
};

const main = async () => {
  const [
    packageJsonSource,
    layoutSource,
    providersSource,
    diagnosticsSource,
    profileSource,
    readmeSource,
    testingDocSource,
    masterPlanSource,
  ] = await Promise.all([
    readUtf8Async(packageJsonPath),
    readUtf8Async(layoutPath),
    readUtf8Async(providersPath),
    readUtf8Async(diagnosticsPath),
    readUtf8Async(profilePath),
    readUtf8Async(readmePath),
    readUtf8Async(testingDocPath),
    readUtf8Async(masterPlanPath),
  ]);

  const hasDevClientDependency =
    packageJsonSource.includes('"expo-dev-client"') &&
    packageJsonSource.includes('"audit:native-push-device-readiness"');
  const layoutImportsDevClient = layoutSource.includes('import "expo-dev-client";');
  const providerWired =
    providersSource.includes("<NativePushDiagnosticsProvider>") &&
    providersSource.includes("NativePushDiagnosticsProvider") &&
    providersSource.includes("<SessionProvider>");
  const diagnosticsCapturePresent =
    diagnosticsSource.includes("addNotificationReceivedListener") &&
    diagnosticsSource.includes("addNotificationResponseReceivedListener") &&
    diagnosticsSource.includes("getLastNotificationResponse") &&
    diagnosticsSource.includes("clearLastNotificationResponse") &&
    diagnosticsSource.includes("lastNotification: responseCapture") &&
    diagnosticsSource.includes("lastNotificationResponse: responseCapture");
  const profileSurfacePresent =
    profileSource.includes("useNativePushDiagnostics") &&
    profileSource.includes("diagnostics.lastNotification") &&
    profileSource.includes("diagnostics.lastNotificationResponse") &&
    profileSource.includes("refreshPushPermissionStateAsync") &&
    profileSource.includes("clearCapturedPushActivity") &&
    profileSource.includes("Local notification activity does not prove remote APNs or FCM delivery yet.") &&
    profileSource.includes("Native push device smoke") &&
    profileSource.includes("Refresh push diagnostics") &&
    profileSource.includes("Clear captured push activity");

  const normalizedReadmeSource = readmeSource.toLowerCase();
  const normalizedTestingDocSource = testingDocSource.toLowerCase();
  const normalizedMasterPlanSource = masterPlanSource.toLowerCase();
  const docsAligned =
    normalizedReadmeSource.includes("expo-dev-client") &&
    normalizedReadmeSource.includes("native push diagnostics") &&
    normalizedReadmeSource.includes("remote source prove apns or fcm-backed delivery") &&
    normalizedTestingDocSource.includes("mobile native push device readiness") &&
    normalizedTestingDocSource.includes("physical-device requirement") &&
    normalizedTestingDocSource.includes("show a remote source") &&
    normalizedMasterPlanSource.includes("native push diagnostics surface is shipped");

  if (
    !hasDevClientDependency ||
    !layoutImportsDevClient ||
    !providerWired ||
    !diagnosticsCapturePresent ||
    !profileSurfacePresent ||
    !docsAligned
  ) {
    fail("mobile-native-push-device-readiness:failed", [
      `hasDevClientDependency=${hasDevClientDependency}`,
      `layoutImportsDevClient=${layoutImportsDevClient}`,
      `providerWired=${providerWired}`,
      `diagnosticsCapturePresent=${diagnosticsCapturePresent}`,
      `profileSurfacePresent=${profileSurfacePresent}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "native-push-readiness:repo-wired",
      "dev-client:installed",
      "diagnostics-provider:present",
      "docs:aligned",
    ].join("|")
  );
};

void main();
