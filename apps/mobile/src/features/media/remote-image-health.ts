import type { ImageSourcePropType } from "react-native";

type VerifyPublicImageUrlParams = {
  context: string;
  publicUrl: string;
};

const knownBrokenRemoteImageUrls = new Set<string>();

export const normalizeRemoteImageUrl = (publicUrl: string | null | undefined): string | null => {
  if (typeof publicUrl !== "string") {
    return null;
  }

  const normalizedPublicUrl = publicUrl.trim();

  if (normalizedPublicUrl.length === 0) {
    return null;
  }

  return normalizedPublicUrl;
};

export const markRemoteImageUrlBroken = (publicUrl: string): void => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null) {
    return;
  }

  knownBrokenRemoteImageUrls.add(normalizedPublicUrl);
};

export const isKnownBrokenRemoteImageUrl = (publicUrl: string | null | undefined): boolean => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null) {
    return false;
  }

  return knownBrokenRemoteImageUrls.has(normalizedPublicUrl);
};

export const isKnownBrokenRemoteImageSource = (source: ImageSourcePropType | null | undefined): boolean => {
  if (source === null || source === undefined || typeof source === "number" || Array.isArray(source)) {
    return false;
  }

  return isKnownBrokenRemoteImageUrl(source.uri);
};

export const getRemoteImageSourceUri = (source: ImageSourcePropType | null | undefined): string | null => {
  if (source === null || source === undefined || typeof source === "number" || Array.isArray(source)) {
    return null;
  }

  return normalizeRemoteImageUrl(source.uri);
};

export const createRemoteImageSource = (publicUrl: string | null | undefined): ImageSourcePropType | null => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null || isKnownBrokenRemoteImageUrl(normalizedPublicUrl)) {
    return null;
  }

  return { uri: normalizedPublicUrl };
};

export const verifyPublicImageUrlAsync = async ({
  context,
  publicUrl,
}: VerifyPublicImageUrlParams): Promise<void> => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null) {
    throw new Error(`Uploaded image for ${context} has an empty public URL.`);
  }

  const response = await fetch(normalizedPublicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    markRemoteImageUrlBroken(normalizedPublicUrl);
    throw new Error(`Uploaded image for ${context} is not publicly readable. URL: ${normalizedPublicUrl}. Status: ${response.status}.`);
  }

  const rawContentLength = response.headers.get("content-length");

  if (rawContentLength === null) {
    return;
  }

  const contentLength = Number.parseInt(rawContentLength, 10);

  if (Number.isNaN(contentLength)) {
    throw new Error(
      `Uploaded image for ${context} returned an invalid content-length. URL: ${normalizedPublicUrl}. Header: ${rawContentLength}.`
    );
  }

  if (contentLength <= 0) {
    markRemoteImageUrlBroken(normalizedPublicUrl);
    throw new Error(`Uploaded image for ${context} is empty in storage. URL: ${normalizedPublicUrl}.`);
  }
};
