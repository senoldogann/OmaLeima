const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { withDangerousMod, withInfoPlist } = require("expo/config-plugins");

const devLauncherLocalNetworkUsageDescription =
  "Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer.";

const storeBuildProfiles = new Set(["preview", "production"]);

const isStoreBuild = () =>
  process.env.OMALEIMA_STORE_BUILD === "1" ||
  storeBuildProfiles.has(process.env.EAS_BUILD_PROFILE);

const removeExpoDevLauncherBonjourServices = (bonjourServices) => {
  if (!Array.isArray(bonjourServices)) {
    return undefined;
  }

  const filteredServices = bonjourServices.filter((service) => {
    if (typeof service !== "string") {
      return true;
    }

    return service.toLowerCase().replace(/\.$/, "") !== "_expo._tcp";
  });

  return filteredServices.length > 0 ? filteredServices : undefined;
};

const removeStaleExpoIconResources = (projectRoot) => {
  const iosProjectRoot = path.join(projectRoot, "ios", "OmaLeima");
  const staleExpoIconDirectory = path.join(iosProjectRoot, "expo.icon");
  const xcodeProjectPath = path.join(projectRoot, "ios", "OmaLeima.xcodeproj", "project.pbxproj");

  fs.rmSync(staleExpoIconDirectory, {
    force: true,
    recursive: true,
  });

  if (!fs.existsSync(xcodeProjectPath)) {
    return;
  }

  const projectSource = fs.readFileSync(xcodeProjectPath, "utf8");
  const filteredProjectSource = projectSource
    .split(/\r?\n/)
    .filter((line) => !line.includes("expo.icon"))
    .join("\n");

  if (filteredProjectSource !== projectSource) {
    fs.writeFileSync(xcodeProjectPath, `${filteredProjectSource}\n`);
  }
};

const alignGeneratedAppIconName = (projectRoot) => {
  const xcodeProjectPath = path.join(projectRoot, "ios", "OmaLeima.xcodeproj", "project.pbxproj");

  if (!fs.existsSync(xcodeProjectPath)) {
    return;
  }

  const projectSource = fs.readFileSync(xcodeProjectPath, "utf8");
  const alignedProjectSource = projectSource.replace(
    /ASSETCATALOG_COMPILER_APPICON_NAME = expo;/g,
    "ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;"
  );

  if (alignedProjectSource !== projectSource) {
    fs.writeFileSync(xcodeProjectPath, alignedProjectSource);
  }
};

const removeAudioBackgroundMode = (backgroundModes) => {
  if (!Array.isArray(backgroundModes)) {
    return undefined;
  }

  const filteredModes = backgroundModes.filter((mode) => mode !== "audio");

  return filteredModes.length > 0 ? filteredModes : undefined;
};

const deletePlistKey = (plistPath, keyPath) => {
  spawnSync("/usr/libexec/PlistBuddy", ["-c", `Delete ${keyPath}`, plistPath], {
    stdio: "ignore",
  });
};

const sanitizeGeneratedInfoPlist = (projectRoot) => {
  const infoPlistPath = path.join(projectRoot, "ios", "OmaLeima", "Info.plist");

  if (!fs.existsSync(infoPlistPath)) {
    return;
  }

  [
    "NSBonjourServices",
    "NSLocalNetworkUsageDescription",
    "NSMicrophoneUsageDescription",
    "UIBackgroundModes",
    "NSAppTransportSecurity:NSAllowsLocalNetworking",
  ].forEach((keyPath) => {
    deletePlistKey(infoPlistPath, keyPath);
  });
};

const rnscreensCodegenHeaderSearchPatch = `    installer.pods_project.targets.each do |target|
      next unless target.name == 'RNScreens'

      target.build_configurations.each do |config|
        header_search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
        header_search_paths = header_search_paths.split(' ') if header_search_paths.is_a?(String)
        header_search_paths << '"\${PODS_ROOT}/../build/generated/ios/ReactCodegen"'
        config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths.uniq
      end
    end`;

const patchGeneratedPodfile = (projectRoot) => {
  const podfilePath = path.join(projectRoot, "ios", "Podfile");

  if (!fs.existsSync(podfilePath)) {
    return;
  }

  const podfileSource = fs.readFileSync(podfilePath, "utf8");

  if (podfileSource.includes("${PODS_ROOT}/../build/generated/ios/ReactCodegen")) {
    return;
  }

  const postInstallNeedle = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )`;

  if (!podfileSource.includes(postInstallNeedle)) {
    throw new Error("Could not patch iOS Podfile: react_native_post_install block was not found.");
  }

  const patchedPodfileSource = podfileSource.replace(
    postInstallNeedle,
    `${postInstallNeedle}\n\n${rnscreensCodegenHeaderSearchPatch}`
  );

  fs.writeFileSync(podfilePath, patchedPodfileSource);
};

const withStoreInfoPlistHygiene = (config) =>
  withDangerousMod(
    withInfoPlist(config, (innerConfig) => {
      if (!isStoreBuild()) {
        return innerConfig;
      }

      const bonjourServices = removeExpoDevLauncherBonjourServices(
        innerConfig.modResults.NSBonjourServices
      );

      if (bonjourServices === undefined) {
        delete innerConfig.modResults.NSBonjourServices;
      } else {
        innerConfig.modResults.NSBonjourServices = bonjourServices;
      }

      if (
        innerConfig.modResults.NSLocalNetworkUsageDescription ===
        devLauncherLocalNetworkUsageDescription
      ) {
        delete innerConfig.modResults.NSLocalNetworkUsageDescription;
      }

      if (innerConfig.modResults.NSAppTransportSecurity?.NSAllowsLocalNetworking === true) {
        delete innerConfig.modResults.NSAppTransportSecurity.NSAllowsLocalNetworking;
      }

      if (
        typeof innerConfig.modResults.NSAppTransportSecurity === "object" &&
        innerConfig.modResults.NSAppTransportSecurity !== null &&
        Object.keys(innerConfig.modResults.NSAppTransportSecurity).length === 0
      ) {
        delete innerConfig.modResults.NSAppTransportSecurity;
      }

      const backgroundModes = removeAudioBackgroundMode(
        innerConfig.modResults.UIBackgroundModes
      );

      if (backgroundModes === undefined) {
        delete innerConfig.modResults.UIBackgroundModes;
      } else {
        innerConfig.modResults.UIBackgroundModes = backgroundModes;
      }

      delete innerConfig.modResults.NSMicrophoneUsageDescription;

      return innerConfig;
    }),
    [
      "ios",
      (innerConfig) => {
        patchGeneratedPodfile(innerConfig.modRequest.projectRoot);
        removeStaleExpoIconResources(innerConfig.modRequest.projectRoot);
        alignGeneratedAppIconName(innerConfig.modRequest.projectRoot);
        sanitizeGeneratedInfoPlist(innerConfig.modRequest.projectRoot);

        return innerConfig;
      },
    ]
  );

module.exports = withStoreInfoPlistHygiene;
