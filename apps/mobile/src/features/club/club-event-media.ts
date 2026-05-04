import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

import { readImageUploadBody, verifyPublicImageUrlAsync } from "@/features/media/storage-upload";

type UploadClubEventCoverParams = {
  asset: ImagePicker.ImagePickerAsset;
  clubId: string;
};

type UploadedClubEventCover = {
  publicUrl: string;
  storagePath: string;
};

const eventMediaBucketId = "event-media";
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

  throw new Error(`Unsupported event cover type ${asset.mimeType}. Upload a JPEG, PNG, or WebP image.`);
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

  return `clubs/${clubId}/event-covers/cover-${Date.now()}.${extension}`;
};

export const pickClubEventCoverAsync = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload an event cover.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [16, 9],
    mediaTypes: ["images"],
    quality: 0.88,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
};

export const uploadClubEventCoverAsync = async ({
  asset,
  clubId,
}: UploadClubEventCoverParams): Promise<UploadedClubEventCover> => {
  const mimeType = getMediaType(asset);
  const storagePath = createStoragePath(clubId, mimeType);
  const uploadBody = await readImageUploadBody({
    context: `event cover for club ${clubId}`,
    uri: asset.uri,
  });
  const { error } = await supabase.storage.from(eventMediaBucketId).upload(storagePath, uploadBody, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload event cover for club ${clubId}: ${error.message}`);
  }

  const { data } = supabase.storage.from(eventMediaBucketId).getPublicUrl(storagePath);
  await verifyPublicImageUrlAsync({
    context: `event cover for club ${clubId}`,
    publicUrl: data.publicUrl,
  });

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
