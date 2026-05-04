import type { ImageSourcePropType } from "react-native";

type VerifyPublicImageUrlParams = {
  context: string;
  publicUrl: string;
};

const knownBrokenRemoteImageUrls = new Set<string>();
const verifyAttemptCount = 3;
const verifyRetryDelayMs = 350;

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

const markRemoteImageUrlHealthy = (publicUrl: string): void => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null) {
    return;
  }

  knownBrokenRemoteImageUrls.delete(normalizedPublicUrl);
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

const sleepAsync = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const readPublicImageContentLengthAsync = async (publicUrl: string): Promise<number | null> => {
  const headResponse = await fetch(publicUrl, {
    method: "HEAD",
  });

  if (!headResponse.ok) {
    throw new Error(`Status: ${headResponse.status}.`);
  }

  const rawHeadContentLength = headResponse.headers.get("content-length");

  if (rawHeadContentLength !== null) {
    const headContentLength = Number.parseInt(rawHeadContentLength, 10);

    if (Number.isNaN(headContentLength)) {
      throw new Error(`Invalid content-length header: ${rawHeadContentLength}.`);
    }

    if (headContentLength > 0) {
      return headContentLength;
    }
  }

  const rangeResponse = await fetch(publicUrl, {
    headers: {
      Range: "bytes=0-0",
    },
    method: "GET",
  });

  if (!rangeResponse.ok && rangeResponse.status !== 206) {
    throw new Error(`Range status: ${rangeResponse.status}.`);
  }

  const rangeBody = await rangeResponse.arrayBuffer();

  return rangeBody.byteLength;
};

const verifyPublicImageUrlOnceAsync = async ({
  context,
  publicUrl,
}: VerifyPublicImageUrlParams): Promise<void> => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);

  if (normalizedPublicUrl === null) {
    throw new Error(`Uploaded image for ${context} has an empty public URL.`);
  }

  const contentLength = await readPublicImageContentLengthAsync(normalizedPublicUrl);

  if (contentLength === null) {
    markRemoteImageUrlHealthy(normalizedPublicUrl);
    return;
  }

  if (contentLength <= 0) {
    markRemoteImageUrlBroken(normalizedPublicUrl);
    throw new Error(`Uploaded image for ${context} is empty in storage. URL: ${normalizedPublicUrl}.`);
  }

  markRemoteImageUrlHealthy(normalizedPublicUrl);
};

export const verifyPublicImageUrlAsync = async ({
  context,
  publicUrl,
}: VerifyPublicImageUrlParams): Promise<void> => {
  const normalizedPublicUrl = normalizeRemoteImageUrl(publicUrl);
  let lastError: Error | null = null;

  if (normalizedPublicUrl === null) {
    throw new Error(`Uploaded image for ${context} has an empty public URL.`);
  }

  for (let attempt = 1; attempt <= verifyAttemptCount; attempt += 1) {
    try {
      await verifyPublicImageUrlOnceAsync({
        context,
        publicUrl: normalizedPublicUrl,
      });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < verifyAttemptCount) {
        await sleepAsync(verifyRetryDelayMs * attempt);
      }
    }
  }

  markRemoteImageUrlBroken(normalizedPublicUrl);
  throw new Error(
    `Uploaded image for ${context} is not publicly readable after ${verifyAttemptCount} attempts. URL: ${normalizedPublicUrl}. ${lastError?.message ?? "Unknown verification error."}`
  );
};
