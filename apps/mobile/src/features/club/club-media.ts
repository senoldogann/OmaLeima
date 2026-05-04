import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

import { readImageUploadBody, verifyPublicImageUrlAsync } from "@/features/media/storage-upload";

export type ClubMediaKind = "cover" | "logo";

type UploadClubMediaParams = {
  asset: ImagePicker.ImagePickerAsset;
  clubId: string;
  kind: ClubMediaKind;
};

type UploadedClubMedia = {
  publicUrl: string;
  storagePath: string;
};

const eventMediaBucketId = "event-media";
const supportedMediaTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type SupportedMediaType = (typeof supportedMediaTypes)[number];

const getPickerAspect = (kind: ClubMediaKind): [number, number] => {
  if (kind === "logo") {
    return [1, 1];
  }

  return [16, 9];
};

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

  throw new Error(`Unsupported club media type ${asset.mimeType}. Upload a JPEG, PNG, or WebP image.`);
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

const createStoragePath = (clubId: string, kind: ClubMediaKind, mimeType: SupportedMediaType): string => {
  const extension = getExtension(mimeType);

  return `clubs/${clubId}/club-${kind}-${Date.now()}.${extension}`;
};

export const pickClubMediaAsync = async ({
  kind,
}: {
  kind: ClubMediaKind;
}): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload club media.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: getPickerAspect(kind),
    mediaTypes: ["images"],
    quality: kind === "logo" ? 0.92 : 0.88,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
};

export const uploadClubMediaAsync = async ({
  asset,
  clubId,
  kind,
}: UploadClubMediaParams): Promise<UploadedClubMedia> => {
  const mimeType = getMediaType(asset);
  const storagePath = createStoragePath(clubId, kind, mimeType);
  const uploadBody = await readImageUploadBody({
    context: `${kind} image for club ${clubId}`,
    uri: asset.uri,
  });
  const { error } = await supabase.storage.from(eventMediaBucketId).upload(storagePath, uploadBody, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload ${kind} image for club ${clubId}: ${error.message}`);
  }

  const { data } = supabase.storage.from(eventMediaBucketId).getPublicUrl(storagePath);
  await verifyPublicImageUrlAsync({
    context: `${kind} image for club ${clubId}`,
    publicUrl: data.publicUrl,
  });

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
