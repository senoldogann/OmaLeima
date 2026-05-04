import type { ImageSourcePropType } from "react-native";
import { Image } from "react-native";

import {
  createRemoteImageSource,
  isKnownBrokenRemoteImageUrl,
  markRemoteImageUrlBroken,
  normalizeRemoteImageUrl,
  verifyPublicImageUrlAsync,
} from "@/features/media/remote-image-health";

export type FallbackCoverPurpose =
  | "authOnboarding"
  | "clubControl"
  | "eventDiscovery"
  | "eventDetail"
  | "leaderboard"
  | "qrPass"
  | "rewardCelebration"
  | "rewards";

const fallbackCoverSources = [
  require("../../../assets/event-covers/omaleima-ops-hero.png"),
  require("../../../assets/event-covers/omaleima-leima-pass.png"),
  require("../../../assets/event-covers/omaleima-night-entry.png"),
  require("../../../assets/event-covers/omaleima-qr-checkpoint.png"),
  require("../../../assets/event-covers/omaleima-club-control.png"),
  require("../../../assets/event-covers/laser-crowd.jpg"),
  require("../../../assets/event-covers/bar-friends.jpg"),
  require("../../../assets/event-covers/dj-night.jpg"),
] as const satisfies readonly ImageSourcePropType[];

const fallbackCoverPurposeIndexes = {
  authOnboarding: 5,
  clubControl: 4,
  eventDiscovery: 2,
  eventDetail: 7,
  leaderboard: 0,
  qrPass: 3,
  rewardCelebration: 1,
  rewards: 6,
} as const satisfies Record<FallbackCoverPurpose, number>;

const warnedCoverPrefetchUrls = new Set<string>();

const createDeterministicIndex = (value: string, modulo: number): number => {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % modulo;
};

const createFallbackCoverSource = (eventKey: string): ImageSourcePropType => {
  const normalizedEventKey = eventKey.trim();

  if (normalizedEventKey.length === 0) {
    return fallbackCoverSources[0];
  }

  const index = createDeterministicIndex(normalizedEventKey, fallbackCoverSources.length);

  return fallbackCoverSources[index];
};

export const getFallbackCoverSource = (purpose: FallbackCoverPurpose): ImageSourcePropType =>
  fallbackCoverSources[fallbackCoverPurposeIndexes[purpose]];

export const getFallbackCoverSourceByIndex = (index: number): ImageSourcePropType => {
  const normalizedIndex = Math.abs(index) % fallbackCoverSources.length;

  return fallbackCoverSources[normalizedIndex];
};

export const getOffsetFallbackCoverSourceByIndex = (
  index: number,
  offset: number
): ImageSourcePropType => getFallbackCoverSourceByIndex(index + offset);

const createRemoteCoverSource = (coverImageUrl: string | null): ImageSourcePropType | null => {
  return createRemoteImageSource(coverImageUrl);
};

export const getEventCoverSource = (
  coverImageUrl: string | null,
  eventKey: string
): ImageSourcePropType => {
  const remoteCoverSource = createRemoteCoverSource(coverImageUrl);

  if (remoteCoverSource !== null) {
    return remoteCoverSource;
  }

  return createFallbackCoverSource(eventKey);
};

export const getEventCoverSourceWithFallback = (
  coverImageUrl: string | null,
  fallbackPurpose: FallbackCoverPurpose
): ImageSourcePropType => {
  const remoteCoverSource = createRemoteCoverSource(coverImageUrl);

  if (remoteCoverSource !== null) {
    return remoteCoverSource;
  }

  return getFallbackCoverSource(fallbackPurpose);
};

export const prefetchEventCoverUrls = async (
  coverImageUrls: readonly (string | null)[]
): Promise<void> => {
  const uniqueUrls = [...new Set(coverImageUrls)]
    .map((value) => normalizeRemoteImageUrl(value))
    .filter((value): value is string => value !== null)
    .filter((value) => !isKnownBrokenRemoteImageUrl(value));

  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        await verifyPublicImageUrlAsync({
          context: "event cover prefetch",
          publicUrl: url,
        });
        await Image.prefetch(url);
      } catch (error: unknown) {
        markRemoteImageUrlBroken(url);
        if (!warnedCoverPrefetchUrls.has(url)) {
          warnedCoverPrefetchUrls.add(url);
          console.warn("Failed to prefetch event cover image.", { error, url });
        }
        return false;
      }

      return true;
    })
  );
};
