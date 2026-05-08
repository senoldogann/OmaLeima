import { publicEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export type PublishStagedMediaParams = {
  context: string;
  destinationBucketId: string;
  destinationPath: string;
  stagingPath: string | null;
};

const mediaStagingBucketId = "media-staging";
const signedPreviewTtlSeconds = 60 * 60;
const contentTypeByExtension = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

type SupportedExtension = keyof typeof contentTypeByExtension;

const readExtension = (path: string): SupportedExtension => {
  const extension = path.split(".").pop()?.toLowerCase();

  if (
    extension === "jpeg" ||
    extension === "jpg" ||
    extension === "png" ||
    extension === "webp"
  ) {
    return extension;
  }

  throw new Error(`Unsupported staged media extension for ${path}.`);
};

const verifyPublicMediaUrlAsync = async ({
  context,
  publicUrl,
}: {
  context: string;
  publicUrl: string;
}): Promise<void> => {
  const response = await fetch(publicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    throw new Error(`Published ${context} media is not publicly readable. Status: ${response.status}. URL: ${publicUrl}`);
  }
};

export const createSignedStagedMediaUrlAsync = async (stagingPath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(mediaStagingBucketId)
    .createSignedUrl(stagingPath, signedPreviewTtlSeconds);

  if (error !== null) {
    throw new Error(`Failed to create signed staging media URL for ${stagingPath}: ${error.message}`);
  }

  return data.signedUrl;
};

export const publishStagedMediaAsync = async ({
  context,
  destinationBucketId,
  destinationPath,
  stagingPath,
}: PublishStagedMediaParams): Promise<string | null> => {
  if (stagingPath === null || stagingPath.trim().length === 0) {
    return null;
  }

  const normalizedStagingPath = stagingPath.trim();
  const { data: stagedMedia, error: downloadError } = await supabase.storage
    .from(mediaStagingBucketId)
    .download(normalizedStagingPath);

  if (downloadError !== null) {
    throw new Error(`Failed to download staged ${context} media ${normalizedStagingPath}: ${downloadError.message}`);
  }

  const uploadBody = await stagedMedia.arrayBuffer();
  const extension = readExtension(normalizedStagingPath);
  const { error: uploadError } = await supabase.storage
    .from(destinationBucketId)
    .upload(destinationPath, uploadBody, {
      cacheControl: "3600",
      contentType: contentTypeByExtension[extension],
      upsert: false,
    });

  if (uploadError !== null) {
    throw new Error(`Failed to publish staged ${context} media to ${destinationBucketId}/${destinationPath}: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(destinationBucketId)
    .getPublicUrl(destinationPath);

  await verifyPublicMediaUrlAsync({
    context,
    publicUrl: publicUrlData.publicUrl,
  });

  const { error: removeError } = await supabase.storage
    .from(mediaStagingBucketId)
    .remove([normalizedStagingPath]);

  if (removeError !== null) {
    throw new Error(`Failed to remove staged ${context} media ${normalizedStagingPath}: ${removeError.message}`);
  }

  return publicUrlData.publicUrl;
};

export const isMediaStagingSignedUrl = (value: string): boolean => {
  try {
    const parsedUrl = new URL(value);
    const supabaseUrl = new URL(publicEnv.EXPO_PUBLIC_SUPABASE_URL);

    return parsedUrl.host === supabaseUrl.host && parsedUrl.pathname.includes("/storage/v1/object/sign/media-staging/");
  } catch {
    return false;
  }
};

export const mediaStagingBucketName = mediaStagingBucketId;
