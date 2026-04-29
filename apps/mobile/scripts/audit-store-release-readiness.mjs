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
const readmePath = path.join(mobileRoot, "README.md");
const testingDocPath = path.join(repoRoot, "docs", "TESTING.md");
const launchRunbookPath = path.join(repoRoot, "docs", "LAUNCH_RUNBOOK.md");
const rootReadmePath = path.join(repoRoot, "README.md");

const readUtf8Async = async (filePath) => fs.readFile(filePath, "utf8");
const pathExistsAsync = async (filePath) =>
  fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);

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
const storeAssetPaths = [
  "assets/images/icon.png",
  "assets/expo.icon",
  "assets/images/android-icon-foreground.png",
  "assets/images/android-icon-background.png",
  "assets/images/android-icon-monochrome.png",
  "assets/images/favicon.png",
  "assets/images/splash-icon.png",
];

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
  const [packageJsonSource, appConfigSource, easJsonSource, readmeSource, testingDocSource, launchRunbookSource, rootReadmeSource] =
    await Promise.all([
      readUtf8Async(packageJsonPath),
      readUtf8Async(appConfigPath),
      readUtf8Async(easJsonPath),
      readUtf8Async(readmePath),
      readUtf8Async(testingDocPath),
      readUtf8Async(launchRunbookPath),
      readUtf8Async(rootReadmePath),
    ]);

  const packageJson = JSON.parse(packageJsonSource);
  const easJson = JSON.parse(easJsonSource);
  const remoteEasEnvState = readRemoteEasEnvState();
  const storeAssetExists = await Promise.all(storeAssetPaths.map((relativePath) => pathExistsAsync(path.join(mobileRoot, relativePath))));

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
    appConfigSource.includes('icon: "./assets/expo.icon"') &&
    appConfigSource.includes('favicon: "./assets/images/favicon.png"') &&
    appConfigSource.includes('image: "./assets/images/splash-icon.png"') &&
    appConfigSource.includes('foregroundImage: "./assets/images/android-icon-foreground.png"') &&
    appConfigSource.includes('backgroundImage: "./assets/images/android-icon-background.png"') &&
    appConfigSource.includes('monochromeImage: "./assets/images/android-icon-monochrome.png"') &&
    storeAssetExists.every(Boolean);
  const nativePolicyReady =
    appConfigSource.includes("expo-notifications") &&
    appConfigSource.includes("expo-camera") &&
    appConfigSource.includes('ITSAppUsesNonExemptEncryption: false') &&
    appConfigSource.includes("Allow OmaLeima to access the camera for QR scanning.") &&
    appConfigSource.includes("projectId: easProjectId");
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
  const remoteEasEnvReady = requiredEasEnvironments.every((environmentName) => {
    const envNames = Array.isArray(remoteEasEnvState[environmentName]) ? remoteEasEnvState[environmentName] : [];

    return requiredEasEnvNames.every((requiredName) => envNames.includes(requiredName));
  });

  const normalizedMobileReadme = readmeSource.toLowerCase();
  const normalizedTestingDoc = testingDocSource.toLowerCase();
  const normalizedLaunchRunbook = launchRunbookSource.toLowerCase();
  const normalizedRootReadme = rootReadmeSource.toLowerCase();

  const docsAligned =
    normalizedMobileReadme.includes("audit:store-release-readiness") &&
    normalizedMobileReadme.includes("expo eas cli auth") &&
    normalizedTestingDoc.includes("mobile store/public-launch readiness") &&
    normalizedTestingDoc.includes("app store connect") &&
    normalizedTestingDoc.includes("google play console state") &&
    normalizedLaunchRunbook.includes("store/public launch owner checklist") &&
    normalizedLaunchRunbook.includes("app store connect") &&
    normalizedLaunchRunbook.includes("google play console") &&
    normalizedLaunchRunbook.includes("expo eas environment variables") &&
    normalizedRootReadme.includes("qa:mobile-store-release-readiness");

  if (!packageScriptPresent || !appIdentityReady || !buildAssetsReady || !nativePolicyReady || !easCliReady || !remoteEasEnvReady || !docsAligned) {
    fail("mobile-store-release-readiness:failed", [
      `packageScriptPresent=${packageScriptPresent}`,
      `appIdentityReady=${appIdentityReady}`,
      `buildAssetsReady=${buildAssetsReady}`,
      `nativePolicyReady=${nativePolicyReady}`,
      `easCliReady=${easCliReady}`,
      `remoteEasEnvReady=${remoteEasEnvReady}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "mobile-store-release-readiness:READY",
      "app-identity:present",
      "build-assets:present",
      "native-policy:present",
      "eas-build-environments:explicit",
      "eas-remote-envs:present",
      "owner-store-tasks:documented",
      "next:prepare-app-store-connect-and-google-play-listings-when-broader-launch-starts",
    ].join("|")
  );
};

void main();
