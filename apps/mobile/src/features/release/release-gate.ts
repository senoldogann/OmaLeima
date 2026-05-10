import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

export type MobileReleasePlatform = "IOS" | "ANDROID" | "WEB";

export type MobileReleaseRequirementRow = {
  is_blocking: boolean;
  message_en: string;
  message_fi: string;
  minimum_app_version: string;
  minimum_build_number: number | null;
  platform: MobileReleasePlatform;
  update_url: string | null;
};

export type CurrentMobileRelease = {
  appVersion: string;
  buildNumber: number | null;
  isReleaseBuild: boolean;
  platform: MobileReleasePlatform;
};

export type MobileReleaseGateState =
  | {
      status: "READY";
      currentRelease: CurrentMobileRelease;
      requirement: MobileReleaseRequirementRow | null;
    }
  | {
      status: "BLOCKED";
      currentRelease: CurrentMobileRelease;
      reason: "STALE_VERSION" | "STALE_BUILD";
      requirement: MobileReleaseRequirementRow;
    };

const defaultAppVersion = "0.0.0";

const toReleasePlatform = (): MobileReleasePlatform => {
  if (Platform.OS === "ios") {
    return "IOS";
  }

  if (Platform.OS === "android") {
    return "ANDROID";
  }

  return "WEB";
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const readNativeBuildNumber = (platform: MobileReleasePlatform): number | null => {
  if (platform === "IOS") {
    return parsePositiveInteger(Constants.platform?.ios?.buildNumber);
  }

  if (platform === "ANDROID") {
    return parsePositiveInteger(Constants.platform?.android?.versionCode);
  }

  return null;
};

const normalizeVersionSegments = (version: string): [number, number, number] => {
  const segments = version.split(".").map((segment) => Number.parseInt(segment, 10));

  return [
    Number.isInteger(segments[0]) ? segments[0] : 0,
    Number.isInteger(segments[1]) ? segments[1] : 0,
    Number.isInteger(segments[2]) ? segments[2] : 0,
  ];
};

export const compareSemanticVersions = (currentVersion: string, minimumVersion: string): number => {
  const currentSegments = normalizeVersionSegments(currentVersion);
  const minimumSegments = normalizeVersionSegments(minimumVersion);

  for (let index = 0; index < currentSegments.length; index += 1) {
    const currentSegment = currentSegments[index];
    const minimumSegment = minimumSegments[index];

    if (currentSegment > minimumSegment) {
      return 1;
    }

    if (currentSegment < minimumSegment) {
      return -1;
    }
  }

  return 0;
};

export const readCurrentMobileRelease = (): CurrentMobileRelease => {
  const platform = toReleasePlatform();

  return {
    appVersion: Constants.expoConfig?.version ?? defaultAppVersion,
    buildNumber: readNativeBuildNumber(platform),
    isReleaseBuild: Constants.executionEnvironment === ExecutionEnvironment.Standalone,
    platform,
  };
};

export const fetchMobileReleaseRequirementAsync = async (
  platform: MobileReleasePlatform
): Promise<MobileReleaseRequirementRow | null> => {
  const { data, error } = await supabase
    .from("mobile_release_requirements")
    .select("platform,minimum_app_version,minimum_build_number,is_blocking,update_url,message_fi,message_en")
    .eq("platform", platform)
    .maybeSingle<MobileReleaseRequirementRow>();

  if (error !== null) {
    throw new Error(`Failed to load mobile release requirement for ${platform}: ${error.message}`);
  }

  return data;
};

export const evaluateMobileReleaseGate = (
  currentRelease: CurrentMobileRelease,
  requirement: MobileReleaseRequirementRow | null
): MobileReleaseGateState => {
  if (requirement === null || !currentRelease.isReleaseBuild || !requirement.is_blocking) {
    return {
      status: "READY",
      currentRelease,
      requirement,
    };
  }

  if (compareSemanticVersions(currentRelease.appVersion, requirement.minimum_app_version) < 0) {
    return {
      status: "BLOCKED",
      currentRelease,
      reason: "STALE_VERSION",
      requirement,
    };
  }

  if (
    requirement.minimum_build_number !== null &&
    (currentRelease.buildNumber === null || currentRelease.buildNumber < requirement.minimum_build_number)
  ) {
    return {
      status: "BLOCKED",
      currentRelease,
      reason: "STALE_BUILD",
      requirement,
    };
  }

  return {
    status: "READY",
    currentRelease,
    requirement,
  };
};
