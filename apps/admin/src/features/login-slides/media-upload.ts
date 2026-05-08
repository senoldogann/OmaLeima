import type { SupabaseClient } from "@supabase/supabase-js";

type UploadLoginSlideImageParams = {
  file: File;
  supabase: SupabaseClient;
};

type UploadedLoginSlideImage = {
  publicUrl: string;
  storagePath: string;
};

const loginSliderMediaBucketId = "login-slider-media";
const maxLoginSlideImageBytes = 6 * 1024 * 1024;
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
    return "login-slide";
  }

  return normalizedName.slice(0, 80);
};

const createStoragePath = (file: File, imageType: SupportedImageType): string => {
  const extension = extensionByType[imageType];
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return `login-slides/${Date.now()}-${safeName}.${extension}`;
};

export const uploadLoginSlideImageAsync = async ({
  file,
  supabase,
}: UploadLoginSlideImageParams): Promise<UploadedLoginSlideImage> => {
  if (file.size <= 0) {
    throw new Error("Selected login slide image is empty.");
  }

  if (file.size > maxLoginSlideImageBytes) {
    throw new Error("Login slide image must be 6 MB or smaller.");
  }

  if (!isSupportedImageType(file.type)) {
    throw new Error("Login slide image must be a JPEG, PNG, or WebP file.");
  }

  const storagePath = createStoragePath(file, file.type);
  const { error } = await supabase.storage.from(loginSliderMediaBucketId).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload login slide image: ${error.message}`);
  }

  const { data } = supabase.storage.from(loginSliderMediaBucketId).getPublicUrl(storagePath);
  const response = await fetch(data.publicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    throw new Error(`Uploaded login slide image is not publicly readable. Status: ${response.status}. URL: ${data.publicUrl}`);
  }

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
