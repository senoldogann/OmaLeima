import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishStagedMediaParams = {
  context: string;
  destinationBucketId: string;
  destinationPath: string;
  stagingPath: string | null;
  supabase: SupabaseClient;
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

export const createSignedStagedMediaUrlAsync = async ({
  stagingPath,
  supabase,
}: {
  stagingPath: string;
  supabase: SupabaseClient;
}): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(mediaStagingBucketId)
    .createSignedUrl(stagingPath, signedPreviewTtlSeconds);

  if (error !== null) {
    throw new Error(`Failed to create signed staging media URL for ${stagingPath}: ${error.message}`);
  }

  return data.signedUrl;
};

const removePublishedMediaAfterFailureAsync = async ({
  context,
  destinationBucketId,
  destinationPath,
  originalError,
  supabase,
}: {
  context: string;
  destinationBucketId: string;
  destinationPath: string;
  originalError: unknown;
  supabase: SupabaseClient;
}): Promise<never> => {
  const { error: cleanupError } = await supabase.storage
    .from(destinationBucketId)
    .remove([destinationPath]);

  if (cleanupError !== null) {
    throw new Error(
      `Failed to finalize published ${context} media and failed to remove orphaned ${destinationBucketId}/${destinationPath}: ${
        originalError instanceof Error ? originalError.message : String(originalError)
      }; cleanup error: ${cleanupError.message}`
    );
  }

  throw originalError instanceof Error
    ? originalError
    : new Error(`Failed to finalize published ${context} media: ${String(originalError)}`);
};

export const publishStagedMediaAsync = async ({
  context,
  destinationBucketId,
  destinationPath,
  stagingPath,
  supabase,
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

  const extension = readExtension(normalizedStagingPath);
  const { error: uploadError } = await supabase.storage
    .from(destinationBucketId)
    .upload(destinationPath, stagedMedia, {
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

  try {
    const response = await fetch(publicUrlData.publicUrl, {
      method: "HEAD",
    });

    if (!response.ok) {
      throw new Error(`Published ${context} media is not publicly readable. Status: ${response.status}. URL: ${publicUrlData.publicUrl}`);
    }

    const { error: removeError } = await supabase.storage
      .from(mediaStagingBucketId)
      .remove([normalizedStagingPath]);

    if (removeError !== null) {
      throw new Error(`Failed to remove staged ${context} media ${normalizedStagingPath}: ${removeError.message}`);
    }
  } catch (error) {
    await removePublishedMediaAfterFailureAsync({
      context,
      destinationBucketId,
      destinationPath,
      originalError: error,
      supabase,
    });
  }

  return publicUrlData.publicUrl;
};

export const mediaStagingBucketName = mediaStagingBucketId;
