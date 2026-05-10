import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const root = path.resolve(mobileRoot, "..", "..");

const packageJsonPath = path.join(mobileRoot, "package.json");
const readmePath = path.join(mobileRoot, "README.md");
const testingDocPath = path.join(root, "docs", "TESTING.md");
const launchRunbookPath = path.join(root, "docs", "LAUNCH_RUNBOOK.md");
const envTomlPath = path.join(mobileRoot, ".codex", "environments", "environment.toml");
const runScriptPath = path.join(mobileRoot, "script", "build_and_run.sh");
const nativeSimulatorSmokePath = path.join(mobileRoot, "scripts", "smoke-native-simulators.mjs");
const nativePushAuditPath = path.join(mobileRoot, "scripts", "audit-native-push-device-readiness.mjs");

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
    readmeSource,
    testingDocSource,
    launchRunbookSource,
    envTomlSource,
    runScriptSource,
    nativeSimulatorSmokeSource,
    nativePushAuditSource,
  ] = await Promise.all([
    readUtf8Async(packageJsonPath),
    readUtf8Async(readmePath),
    readUtf8Async(testingDocPath),
    readUtf8Async(launchRunbookPath),
    readUtf8Async(envTomlPath),
    readUtf8Async(runScriptPath),
    readUtf8Async(nativeSimulatorSmokePath),
    readUtf8Async(nativePushAuditPath),
  ]);

  const packageWired =
    packageJsonSource.includes('"audit:native-simulator-smoke"') &&
    packageJsonSource.includes('"expo-dev-client"');
  const runScriptWired =
    runScriptSource.includes("start --dev-client") &&
    runScriptSource.includes("start --ios") &&
    runScriptSource.includes("start --android") &&
    runScriptSource.includes("start --web") &&
    runScriptSource.includes("export --platform web") &&
    runScriptSource.includes("expo-doctor");
  const codexActionsWired =
    envTomlSource.includes('name = "Run"') &&
    envTomlSource.includes('command = "./script/build_and_run.sh"') &&
    envTomlSource.includes('name = "Run Web"') &&
    envTomlSource.includes('command = "./script/build_and_run.sh --web"') &&
    envTomlSource.includes('name = "Run Dev Client"') &&
    envTomlSource.includes('name = "Expo Doctor"') &&
    envTomlSource.includes('command = "./script/build_and_run.sh --doctor"') &&
    envTomlSource.includes('name = "Export Web"') &&
    envTomlSource.includes('command = "./script/build_and_run.sh --export-web"') &&
    envTomlSource.includes('name = "Run iOS"') &&
    envTomlSource.includes('name = "Run Android"') &&
    envTomlSource.includes('./script/build_and_run.sh --dev-client');
  const existingDeviceAuditReferenced =
    nativePushAuditSource.includes("diagnostics-provider:present");
  const executableSmokeWired =
    packageJsonSource.includes('"smoke:native-simulators"') &&
    nativeSimulatorSmokeSource.includes("android-native-smoke:passed") &&
    nativeSimulatorSmokeSource.includes("ios-native-smoke:passed") &&
    nativeSimulatorSmokeSource.includes("uiautomator") &&
    nativeSimulatorSmokeSource.includes("xcodebuild") &&
    nativeSimulatorSmokeSource.includes("simctl") &&
    nativeSimulatorSmokeSource.includes("logcat") &&
    nativeSimulatorSmokeSource.includes("native-simulator-smoke:passed");

  const normalizedReadmeSource = readmeSource.toLowerCase();
  const normalizedTestingDocSource = testingDocSource.toLowerCase();
  const normalizedLaunchRunbookSource = launchRunbookSource.toLowerCase();
  const docsAligned =
    normalizedReadmeSource.includes("codex action") &&
    normalizedReadmeSource.includes("smoke:native-simulators") &&
    normalizedReadmeSource.includes("run dev client") &&
    normalizedReadmeSource.includes("simulator or emulator") &&
    normalizedTestingDocSource.includes("mobile native simulator and emulator wiring") &&
    normalizedTestingDocSource.includes("smoke:native-simulators") &&
    normalizedTestingDocSource.includes("native-simulator-smoke:passed") &&
    normalizedLaunchRunbookSource.includes("native push smoke handoff") &&
    normalizedLaunchRunbookSource.includes("smoke:native-simulators");

  if (
    !packageWired ||
    !runScriptWired ||
    !codexActionsWired ||
    !existingDeviceAuditReferenced ||
    !executableSmokeWired ||
    !docsAligned
  ) {
    fail("mobile-native-simulator-smoke:failed", [
      `packageWired=${packageWired}`,
      `runScriptWired=${runScriptWired}`,
      `codexActionsWired=${codexActionsWired}`,
      `existingDeviceAuditReferenced=${existingDeviceAuditReferenced}`,
      `executableSmokeWired=${executableSmokeWired}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "native-simulator-wiring:repo-wired",
      "codex-run-actions:present",
      "dev-client-entrypoint:present",
      "native-launch-smoke:scripted",
      "docs:aligned",
    ].join("|")
  );
};

void main();
