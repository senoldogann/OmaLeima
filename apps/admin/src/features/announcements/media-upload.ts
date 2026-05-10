import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignedStagedMediaUrlAsync, mediaStagingBucketName } from "@/features/media/staged-media";

export type AnnouncementImageUploadScope =
  | {
      scope: "ADMIN";
    }
  | {
      clubId: string;
      scope: "CLUB";
    };

type UploadAnnouncementImageParams = {
  file: File;
  scope: AnnouncementImageUploadScope;
  supabase: SupabaseClient;
};

type UploadedAnnouncementImage = {
  previewUrl: string;
  stagingPath: string;
};

const maxAnnouncementImageBytes = 5 * 1024 * 1024;
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
    return "announcement";
  }

  return normalizedName.slice(0, 80);
};

const createStoragePath = ({
  file,
  imageType,
  scope,
  userId,
}: {
  file: File;
  imageType: SupportedImageType;
  scope: AnnouncementImageUploadScope;
  userId: string;
}): string => {
  const extension = extensionByType[imageType];
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const fileName = `${Date.now()}-${safeName}.${extension}`;

  if (scope.scope === "ADMIN") {
    return `users/${userId}/announcements/platform/${fileName}`;
  }

  if (scope.clubId.trim().length === 0) {
    throw new Error("Select a club before uploading a club announcement image.");
  }

  return `users/${userId}/announcements/clubs/${scope.clubId}/${fileName}`;
};

export const uploadAnnouncementImageAsync = async ({
  file,
  scope,
  supabase,
}: UploadAnnouncementImageParams): Promise<UploadedAnnouncementImage> => {
  if (file.size <= 0) {
    throw new Error("Selected announcement image is empty.");
  }

  if (file.size > maxAnnouncementImageBytes) {
    throw new Error("Announcement image must be 5 MB or smaller.");
  }

  if (!isSupportedImageType(file.type)) {
    throw new Error("Announcement image must be a JPEG, PNG, or WebP file.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || userData.user === null) {
    throw new Error(userError?.message ?? "Sign in again before uploading an announcement image.");
  }

  const storagePath = createStoragePath({
    file,
    imageType: file.type,
    scope,
    userId: userData.user.id,
  });
  const { error } = await supabase.storage.from(mediaStagingBucketName).upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload private announcement image: ${error.message}`);
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
