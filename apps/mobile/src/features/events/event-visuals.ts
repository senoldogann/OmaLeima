import type { ImageSourcePropType } from "react-native";

const fallbackCoverSources = [
  require("../../../assets/event-covers/laser-crowd.jpg"),
  require("../../../assets/event-covers/bar-friends.jpg"),
  require("../../../assets/event-covers/dj-night.jpg"),
] as const satisfies readonly ImageSourcePropType[];

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

export const getFallbackCoverSourceByIndex = (index: number): ImageSourcePropType => {
  const normalizedIndex = Math.abs(index) % fallbackCoverSources.length;

  return fallbackCoverSources[normalizedIndex];
};

const createRemoteCoverSource = (coverImageUrl: string | null): ImageSourcePropType | null => {
  if (coverImageUrl === null) {
    return null;
  }

  const normalizedCoverImageUrl = coverImageUrl.trim();

  if (normalizedCoverImageUrl.length === 0) {
    return null;
  }

  return { uri: normalizedCoverImageUrl };
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
