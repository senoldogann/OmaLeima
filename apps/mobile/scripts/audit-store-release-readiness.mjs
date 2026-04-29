import { promises as fs } from "node:fs";
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

const fail = (code, details) => {
  console.error(code);
  details.forEach((detail) => {
    console.error(`- ${detail}`);
  });
  process.exit(1);
};

const hasSemverVersion = (source) => /version:\s*"(\d+)\.(\d+)\.(\d+)"/.test(source);

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
    appConfigSource.includes('favicon: "./assets/images/favicon.png"') &&
    appConfigSource.includes('image: "./assets/images/splash-icon.png"') &&
    appConfigSource.includes('foregroundImage: "./assets/images/android-icon-foreground.png"') &&
    appConfigSource.includes('backgroundImage: "./assets/images/android-icon-background.png"') &&
    appConfigSource.includes('monochromeImage: "./assets/images/android-icon-monochrome.png"');
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

  const normalizedMobileReadme = readmeSource.toLowerCase();
  const normalizedTestingDoc = testingDocSource.toLowerCase();
  const normalizedLaunchRunbook = launchRunbookSource.toLowerCase();
  const normalizedRootReadme = rootReadmeSource.toLowerCase();

  const docsAligned =
    normalizedMobileReadme.includes("audit:store-release-readiness") &&
    normalizedTestingDoc.includes("mobile store/public-launch readiness") &&
    normalizedTestingDoc.includes("app store connect") &&
    normalizedTestingDoc.includes("google play console state") &&
    normalizedLaunchRunbook.includes("store/public launch owner checklist") &&
    normalizedLaunchRunbook.includes("app store connect") &&
    normalizedLaunchRunbook.includes("google play console") &&
    normalizedRootReadme.includes("qa:mobile-store-release-readiness");

  if (!packageScriptPresent || !appIdentityReady || !buildAssetsReady || !nativePolicyReady || !easCliReady || !docsAligned) {
    fail("mobile-store-release-readiness:failed", [
      `packageScriptPresent=${packageScriptPresent}`,
      `appIdentityReady=${appIdentityReady}`,
      `buildAssetsReady=${buildAssetsReady}`,
      `nativePolicyReady=${nativePolicyReady}`,
      `easCliReady=${easCliReady}`,
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
      "owner-store-tasks:documented",
      "next:prepare-app-store-connect-and-google-play-listings-when-broader-launch-starts",
    ].join("|")
  );
};

void main();
