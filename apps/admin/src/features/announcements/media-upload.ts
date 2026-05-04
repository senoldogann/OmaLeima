import type { SupabaseClient } from "@supabase/supabase-js";

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
  publicUrl: string;
  storagePath: string;
};

const announcementMediaBucketId = "announcement-media";
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
}: {
  file: File;
  imageType: SupportedImageType;
  scope: AnnouncementImageUploadScope;
}): string => {
  const extension = extensionByType[imageType];
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const fileName = `${Date.now()}-${safeName}.${extension}`;

  if (scope.scope === "ADMIN") {
    return `platform/${fileName}`;
  }

  if (scope.clubId.trim().length === 0) {
    throw new Error("Select a club before uploading a club announcement image.");
  }

  return `clubs/${scope.clubId}/${fileName}`;
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

  const storagePath = createStoragePath({
    file,
    imageType: file.type,
    scope,
  });
  const { error } = await supabase.storage.from(announcementMediaBucketId).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload announcement image: ${error.message}`);
  }

  const { data } = supabase.storage.from(announcementMediaBucketId).getPublicUrl(storagePath);
  const response = await fetch(data.publicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    throw new Error(`Uploaded announcement image is not publicly readable. Status: ${response.status}. URL: ${data.publicUrl}`);
  }

  const rawContentLength = response.headers.get("content-length");

  if (rawContentLength !== null) {
    const contentLength = Number.parseInt(rawContentLength, 10);

    if (Number.isNaN(contentLength)) {
      throw new Error(`Uploaded announcement image returned invalid content-length: ${rawContentLength}.`);
    }

    if (contentLength <= 0) {
      throw new Error(`Uploaded announcement image is empty in storage. URL: ${data.publicUrl}`);
    }
  }

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
