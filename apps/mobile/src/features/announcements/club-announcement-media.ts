import * as ImagePicker from "expo-image-picker";

import { readImageUploadBody, verifyPublicImageUrlAsync } from "@/features/media/storage-upload";
import { supabase } from "@/lib/supabase";

type UploadClubAnnouncementImageParams = {
  asset: ImagePicker.ImagePickerAsset;
  clubId: string;
};

type UploadedClubAnnouncementImage = {
  publicUrl: string;
  storagePath: string;
};

const announcementMediaBucketId = "announcement-media";
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

const createStoragePath = (clubId: string, mimeType: SupportedMediaType): string => {
  const extension = getExtension(mimeType);

  return `clubs/${clubId}/announcements/announcement-${Date.now()}.${extension}`;
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
  const storagePath = createStoragePath(clubId, mimeType);
  const uploadBody = await readImageUploadBody({
    base64: asset.base64 ?? null,
    context: `announcement image for club ${clubId}`,
    uri: asset.uri,
  });
  const { error } = await supabase.storage.from(announcementMediaBucketId).upload(storagePath, uploadBody, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload announcement image for club ${clubId}: ${error.message}`);
  }

  const { data } = supabase.storage.from(announcementMediaBucketId).getPublicUrl(storagePath);
  await verifyPublicImageUrlAsync({
    context: `announcement image for club ${clubId}`,
    publicUrl: data.publicUrl,
  });

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
