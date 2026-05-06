import type { SupabaseClient } from "@supabase/supabase-js";

type UploadClubEventCoverImageParams = {
  clubId: string;
  file: File;
  supabase: SupabaseClient;
};

type UploadedClubEventCoverImage = {
  publicUrl: string;
  storagePath: string;
};

const eventMediaBucketId = "event-media";
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
}: {
  clubId: string;
  file: File;
  imageType: SupportedImageType;
}): string => {
  if (clubId.trim().length === 0) {
    throw new Error("Select a club before uploading an event cover image.");
  }

  const extension = extensionByType[imageType];
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return `clubs/${clubId}/events/${Date.now()}-${safeName}.${extension}`;
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

  const storagePath = createStoragePath({
    clubId,
    file,
    imageType: file.type,
  });
  const { error } = await supabase.storage.from(eventMediaBucketId).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload event cover image: ${error.message}`);
  }

  const { data } = supabase.storage.from(eventMediaBucketId).getPublicUrl(storagePath);
  const response = await fetch(data.publicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    throw new Error(`Uploaded event cover image is not publicly readable. Status: ${response.status}. URL: ${data.publicUrl}`);
  }

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
