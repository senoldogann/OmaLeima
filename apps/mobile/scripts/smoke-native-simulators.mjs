import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(mobileRoot, "..", "..");
const artifactRoot = path.join(os.tmpdir(), "omaleima-native-smoke");
const androidPackageName = "fi.omaleima.mobile";
const iosBundleId = "fi.omaleima.mobile";
const androidAvdName = process.env.OMALEIMA_ANDROID_AVD ?? "Pixel_9";
const iosSimulatorId = process.env.OMALEIMA_IOS_SIMULATOR_ID ?? "B9B56B7B-FCF3-4FFB-9F42-2DFF5E5BC0E4";
const androidBootTimeoutMs = 180_000;
const launchWaitMs = 8_000;

const sleepAsync = async (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const fail = (message) => {
  throw new Error(message);
};

const quote = (value) => JSON.stringify(value);

const run = (label, command, args, options) => {
  console.log(`==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    shell: false,
    stdio: options.stdio,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(`${label} failed with status ${String(result.status)}${output.length > 0 ? `\n${output}` : ""}`);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const runCapture = (label, command, args, cwd, env) =>
  run(label, command, args, {
    cwd,
    env,
    stdio: "pipe",
  });

const runInherit = (label, command, args, cwd, env) => {
  run(label, command, args, {
    cwd,
    env,
    stdio: "inherit",
  });
};

const parseModes = (args) => {
  const requestedModes = new Set();

  for (const arg of args) {
    if (arg === "--android") {
      requestedModes.add("android");
      continue;
    }

    if (arg === "--ios") {
      requestedModes.add("ios");
      continue;
    }

    if (arg === "--all") {
      requestedModes.add("android");
      requestedModes.add("ios");
      continue;
    }

    if (arg === "--help" || arg === "help") {
      console.log("usage: node scripts/smoke-native-simulators.mjs [--android] [--ios] [--all]");
      process.exit(0);
    }

    fail(`Unknown argument ${quote(arg)}`);
  }

  if (requestedModes.size === 0) {
    requestedModes.add("android");
    requestedModes.add("ios");
  }

  return requestedModes;
};

const resolveAndroidSdkRoot = () => {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  for (const candidate of candidates) {
    const adbPath = path.join(candidate, "platform-tools", "adb");
    const emulatorPath = path.join(candidate, "emulator", "emulator");
    if (existsSync(adbPath) && existsSync(emulatorPath)) {
      return candidate;
    }
  }

  fail("Android SDK with adb and emulator was not found.");
};

const resolveJavaHome = () => {
  if (typeof process.env.JAVA_HOME === "string" && process.env.JAVA_HOME.length > 0) {
    return process.env.JAVA_HOME;
  }

  const androidStudioJbr = "/Applications/Android Studio.app/Contents/jbr/Contents/Home";
  if (existsSync(androidStudioJbr)) {
    return androidStudioJbr;
  }

  return "";
};

const parseAdbSerials = (adbOutput) =>
  adbOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0])
    .filter((serial) => serial.length > 0);

const getAndroidSerials = (adbPath) => {
  const { stdout } = runCapture("adb devices", adbPath, ["devices"], repoRoot, process.env);
  return parseAdbSerials(stdout);
};

const waitForAndroidDeviceAsync = async (adbPath) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < androidBootTimeoutMs) {
    const serials = getAndroidSerials(adbPath);
    if (serials.length > 0) {
      return serials[0];
    }

    await sleepAsync(2_000);
  }

  fail(`Android emulator did not appear in adb within ${String(androidBootTimeoutMs)}ms.`);
};

const ensureAndroidDeviceAsync = async (sdkRoot) => {
  const adbPath = path.join(sdkRoot, "platform-tools", "adb");
  const emulatorPath = path.join(sdkRoot, "emulator", "emulator");
  const existingSerials = getAndroidSerials(adbPath);

  if (existingSerials.length > 0) {
    return existingSerials[0];
  }

  console.log(`==> Starting Android emulator ${androidAvdName}`);
  const emulatorProcess = spawn(emulatorPath, ["-avd", androidAvdName, "-no-snapshot-save"], {
    cwd: repoRoot,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  emulatorProcess.unref();

  return waitForAndroidDeviceAsync(adbPath);
};

const waitForAndroidBootAsync = async (adbPath, serial) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < androidBootTimeoutMs) {
    const { stdout } = runCapture(
      "android boot status",
      adbPath,
      ["-s", serial, "shell", "getprop", "sys.boot_completed"],
      repoRoot,
      process.env
    );

    if (stdout.trim() === "1") {
      return;
    }

    await sleepAsync(2_000);
  }

  fail(`Android emulator ${serial} did not finish booting within ${String(androidBootTimeoutMs)}ms.`);
};

const writeArtifact = (fileName, content) => {
  mkdirSync(artifactRoot, { recursive: true });
  const artifactPath = path.join(artifactRoot, fileName);
  writeFileSync(artifactPath, content);
  return artifactPath;
};

const runWithLogArtifact = (label, command, args, cwd, env, artifactFileName) => {
  console.log(`==> ${label}`);
  mkdirSync(artifactRoot, { recursive: true });
  const artifactPath = path.join(artifactRoot, artifactFileName);
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    stdio: "pipe",
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  writeFileSync(artifactPath, output);

  if (result.status !== 0) {
    const tail = output.split("\n").slice(-120).join("\n");
    fail(`${label} failed with status ${String(result.status)}. Full log: ${artifactPath}\n${tail}`);
  }

  console.log(`${label}:log=${artifactPath}`);
};

const assertAndroidLaunchUi = (uiXml) => {
  const acceptedMarkers = [
    "Accept and continue",
    "Continue with Google",
    "Student",
    "Business",
    "Checking app version",
    "Update required",
    "Could not verify app version",
  ];

  const markerFound = acceptedMarkers.some((marker) => uiXml.includes(marker));
  if (!markerFound) {
    const artifactPath = writeArtifact("android-ui-missing-marker.xml", uiXml);
    fail(`Android launch UI did not contain an expected startup marker. UI artifact: ${artifactPath}`);
  }
};

const smokeAndroidAsync = async () => {
  const sdkRoot = resolveAndroidSdkRoot();
  const adbPath = path.join(sdkRoot, "platform-tools", "adb");
  const javaHome = resolveJavaHome();
  const androidEnv = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    ...(javaHome.length > 0 ? { JAVA_HOME: javaHome } : {}),
  };
  const serial = await ensureAndroidDeviceAsync(sdkRoot);

  await waitForAndroidBootAsync(adbPath, serial);
  runCapture("android unlock", adbPath, ["-s", serial, "shell", "input", "keyevent", "82"], repoRoot, androidEnv);
  runCapture("android clear crash log", adbPath, ["-s", serial, "logcat", "-c"], repoRoot, androidEnv);
  runInherit(
    "android assemble release apk",
    "./gradlew",
    [":app:assembleRelease", "--console=plain"],
    path.join(mobileRoot, "android"),
    androidEnv
  );

  const apkPath = path.join(mobileRoot, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
  if (!existsSync(apkPath)) {
    fail(`Android release APK was not found at ${apkPath}`);
  }

  runCapture("android install release apk", adbPath, ["-s", serial, "install", "-r", apkPath], repoRoot, androidEnv);
  runCapture("android resolve activity", adbPath, ["-s", serial, "shell", "cmd", "package", "resolve-activity", "--brief", androidPackageName], repoRoot, androidEnv);
  runCapture("android launch app", adbPath, ["-s", serial, "shell", "am", "start", "-n", `${androidPackageName}/.MainActivity`], repoRoot, androidEnv);
  await sleepAsync(launchWaitMs);

  const { stdout: crashLog } = runCapture("android crash log", adbPath, ["-s", serial, "logcat", "-d", "-b", "crash"], repoRoot, androidEnv);
  const crashArtifact = writeArtifact("android-crash.log", crashLog);
  if (crashLog.includes(androidPackageName) || crashLog.includes("FATAL EXCEPTION")) {
    fail(`Android crash log contains a crash marker. Crash artifact: ${crashArtifact}`);
  }

  const { stdout: processOutput } = runCapture("android pid", adbPath, ["-s", serial, "shell", "pidof", "-s", androidPackageName], repoRoot, androidEnv);
  if (processOutput.trim().length === 0) {
    fail("Android app process was not running after launch.");
  }

  const { stdout: uiXml } = runCapture("android ui dump", adbPath, ["-s", serial, "exec-out", "uiautomator", "dump", "/dev/tty"], repoRoot, androidEnv);
  const uiArtifact = writeArtifact("android-ui.xml", uiXml);
  assertAndroidLaunchUi(uiXml);

  const screenshotPath = path.join(artifactRoot, "android-launch.png");
  mkdirSync(artifactRoot, { recursive: true });
  const screenshot = spawnSync(adbPath, ["-s", serial, "exec-out", "screencap", "-p"], {
    cwd: repoRoot,
    env: androidEnv,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
    stdio: "pipe",
  });
  const screenshotBuffer = Buffer.isBuffer(screenshot.stdout) ? screenshot.stdout : Buffer.from(screenshot.stdout ?? "");
  if (screenshot.status !== 0 || screenshotBuffer.length === 0) {
    fail("Android screenshot capture failed.");
  }
  writeFileSync(screenshotPath, screenshotBuffer);

  console.log(`android-native-smoke:passed serial=${serial} ui=${uiArtifact} crashLog=${crashArtifact} screenshot=${screenshotPath}`);
};

const bootIosSimulator = (simulatorId) => {
  const bootResult = spawnSync("xcrun", ["simctl", "boot", simulatorId], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  });

  if (bootResult.status !== 0 && !`${bootResult.stderr}${bootResult.stdout}`.includes("Unable to boot device in current state: Booted")) {
    fail(`iOS simulator boot failed.\n${bootResult.stdout}${bootResult.stderr}`);
  }
};

const findIosAppBundle = (derivedDataPath) => {
  const productsPath = path.join(derivedDataPath, "Build", "Products");
  if (!existsSync(productsPath)) {
    fail(`iOS products directory does not exist: ${productsPath}`);
  }

  const productDirs = readdirSync(productsPath)
    .filter((entry) => entry.endsWith("-iphonesimulator"))
    .map((entry) => path.join(productsPath, entry));

  for (const productDir of productDirs) {
    const appPath = path.join(productDir, "OmaLeima.app");
    if (existsSync(appPath)) {
      return appPath;
    }
  }

  fail(`OmaLeima.app was not found under ${productsPath}`);
};

const smokeIosAsync = async () => {
  const derivedDataPath = path.join(os.tmpdir(), "omaleima-ios-native-smoke-derived");
  rmSync(derivedDataPath, { recursive: true, force: true });
  bootIosSimulator(iosSimulatorId);

  runWithLogArtifact(
    "ios release simulator build",
    "xcodebuild",
    [
      "-quiet",
      "-workspace",
      path.join(mobileRoot, "ios", "OmaLeima.xcworkspace"),
      "-scheme",
      "OmaLeima",
      "-configuration",
      "Release",
      "-sdk",
      "iphonesimulator",
      "-destination",
      `platform=iOS Simulator,id=${iosSimulatorId}`,
      "-derivedDataPath",
      derivedDataPath,
      "build",
      "CODE_SIGNING_ALLOWED=NO",
      "ONLY_ACTIVE_ARCH=YES",
      "COMPILER_INDEX_STORE_ENABLE=NO",
    ],
    repoRoot,
    process.env,
    "ios-xcodebuild.log"
  );

  const appPath = findIosAppBundle(derivedDataPath);
  runCapture("ios install app", "xcrun", ["simctl", "install", iosSimulatorId, appPath], repoRoot, process.env);
  runCapture("ios launch app", "xcrun", ["simctl", "launch", iosSimulatorId, iosBundleId], repoRoot, process.env);
  await sleepAsync(launchWaitMs);

  const { stdout: processList } = runCapture("ios process list", "xcrun", ["simctl", "spawn", iosSimulatorId, "/bin/ps", "-ax"], repoRoot, process.env);
  const processArtifact = writeArtifact("ios-processes.txt", processList);
  if (!processList.includes("OmaLeima")) {
    fail(`iOS app process was not running after launch. Process artifact: ${processArtifact}`);
  }

  const { stdout: logOutput } = runCapture(
    "ios recent logs",
    "xcrun",
    [
      "simctl",
      "spawn",
      iosSimulatorId,
      "log",
      "show",
      "--style",
      "compact",
      "--last",
      "2m",
      "--predicate",
      `process == "OmaLeima" OR eventMessage CONTAINS "${iosBundleId}"`,
    ],
    repoRoot,
    process.env
  );
  const logArtifact = writeArtifact("ios-recent.log", logOutput);
  const fatalMarkers = ["Fatal error", "NSInternalInconsistencyException", "Terminating app due to uncaught exception"];
  const fatalMarkerFound = fatalMarkers.some((marker) => logOutput.includes(marker));
  if (fatalMarkerFound) {
    fail(`iOS recent log contains a fatal marker. Log artifact: ${logArtifact}`);
  }

  const screenshotPath = path.join(artifactRoot, "ios-launch.png");
  runCapture("ios screenshot", "xcrun", ["simctl", "io", iosSimulatorId, "screenshot", screenshotPath], repoRoot, process.env);

  console.log(`ios-native-smoke:passed simulator=${iosSimulatorId} app=${appPath} logs=${logArtifact} screenshot=${screenshotPath}`);
};

const main = async () => {
  const modes = parseModes(process.argv.slice(2));
  mkdirSync(artifactRoot, { recursive: true });

  if (modes.has("android")) {
    await smokeAndroidAsync();
  }

  if (modes.has("ios")) {
    await smokeIosAsync();
  }

  console.log("native-simulator-smoke:passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
