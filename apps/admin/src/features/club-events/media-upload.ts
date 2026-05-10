import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignedStagedMediaUrlAsync, mediaStagingBucketName } from "@/features/media/staged-media";

type UploadClubEventCoverImageParams = {
  clubId: string;
  file: File;
  supabase: SupabaseClient;
};

type UploadedClubEventCoverImage = {
  previewUrl: string;
  stagingPath: string;
};

const maxClubEventImageBytes = 6 * 1024 * 1024;
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const extensionByType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const satisfies Record<SupportedImageType, string>;

type SupportedImageType = (typeof supportedImageTypes)[number];

const isSupportedImageType = (type: string): type is SupportedImageType =>
  supportedImageTypes.includes(type as SupportedImageType);

const sanitizeFileName = (name: string): string => {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalizedName.length === 0) {
    return "event-cover";
  }

  return normalizedName.slice(0, 80);
};

const createStoragePath = ({
  clubId,
  file,
  imageType,
  userId,
}: {
  clubId: string;
  file: File;
  imageType: SupportedImageType;
  userId: string;
}): string => {
  if (clubId.trim().length === 0) {
    throw new Error("Select a club before uploading an event cover image.");
  }

  const extension = extensionByType[imageType];
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return `users/${userId}/event-covers/clubs/${clubId}/${Date.now()}-${safeName}.${extension}`;
};

export const uploadClubEventCoverImageAsync = async ({
  clubId,
  file,
  supabase,
}: UploadClubEventCoverImageParams): Promise<UploadedClubEventCoverImage> => {
  if (file.size <= 0) {
    throw new Error("Selected event cover image is empty.");
  }

  if (file.size > maxClubEventImageBytes) {
    throw new Error("Event cover image must be 6 MB or smaller.");
  }

  if (!isSupportedImageType(file.type)) {
    throw new Error("Event cover image must be a JPEG, PNG, or WebP file.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || userData.user === null) {
    throw new Error(userError?.message ?? "Sign in again before uploading an event cover image.");
  }

  const storagePath = createStoragePath({
    clubId,
    file,
    imageType: file.type,
    userId: userData.user.id,
  });
  const { error } = await supabase.storage.from(mediaStagingBucketName).upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload private event cover image: ${error.message}`);
  }

  const previewUrl = await createSignedStagedMediaUrlAsync({
    stagingPath: storagePath,
    supabase,
  });

  return {
    previewUrl,
    stagingPath: storagePath,
  };
};
