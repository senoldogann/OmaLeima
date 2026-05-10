import * as ImagePicker from "expo-image-picker";

import { readImageUploadBody } from "@/features/media/storage-upload";
import { createSignedStagedMediaUrlAsync, mediaStagingBucketName } from "@/features/media/staged-media";
import { supabase } from "@/lib/supabase";

type UploadClubAnnouncementImageParams = {
  asset: ImagePicker.ImagePickerAsset;
  clubId: string;
};

type UploadedClubAnnouncementImage = {
  previewUrl: string;
  stagingPath: string;
};

const supportedMediaTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type SupportedMediaType = (typeof supportedMediaTypes)[number];

const getMediaType = (asset: ImagePicker.ImagePickerAsset): SupportedMediaType => {
  if (typeof asset.mimeType !== "string" || asset.mimeType.length === 0) {
    return "image/jpeg";
  }

  if (asset.mimeType === "image/jpg") {
    return "image/jpeg";
  }

  if (supportedMediaTypes.includes(asset.mimeType as SupportedMediaType)) {
    return asset.mimeType as SupportedMediaType;
  }

  throw new Error(`Unsupported announcement image type ${asset.mimeType}. Upload a JPEG, PNG, or WebP image.`);
};

const getExtension = (mimeType: SupportedMediaType): "jpg" | "png" | "webp" => {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
};

const createStoragePath = (clubId: string, mimeType: SupportedMediaType, userId: string): string => {
  const extension = getExtension(mimeType);

  return `users/${userId}/announcements/clubs/${clubId}/announcement-${Date.now()}.${extension}`;
};

export const pickClubAnnouncementImageAsync = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload an announcement image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [16, 9],
    base64: true,
    mediaTypes: ["images"],
    quality: 0.88,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
};

export const uploadClubAnnouncementImageAsync = async ({
  asset,
  clubId,
}: UploadClubAnnouncementImageParams): Promise<UploadedClubAnnouncementImage> => {
  const mimeType = getMediaType(asset);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || userData.user === null) {
    throw new Error(userError?.message ?? "Sign in again before uploading an announcement image.");
  }

  const storagePath = createStoragePath(clubId, mimeType, userData.user.id);
  const uploadBody = await readImageUploadBody({
    base64: asset.base64 ?? null,
    context: `announcement image for club ${clubId}`,
    uri: asset.uri,
  });
  const { error } = await supabase.storage.from(mediaStagingBucketName).upload(storagePath, uploadBody, {
    cacheControl: "31536000",
    contentType: mimeType,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload private announcement image for club ${clubId}: ${error.message}`);
  }

  const previewUrl = await createSignedStagedMediaUrlAsync(storagePath);

  return {
    previewUrl,
    stagingPath: storagePath,
  };
};
