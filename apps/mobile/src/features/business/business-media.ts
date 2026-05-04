import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

import { readImageUploadBody, verifyPublicImageUrlAsync } from "@/features/media/storage-upload";

export type BusinessMediaKind = "cover" | "logo";

type PickBusinessMediaParams = {
  kind: BusinessMediaKind;
};

type UploadBusinessMediaParams = {
  businessId: string;
  kind: BusinessMediaKind;
  asset: ImagePicker.ImagePickerAsset;
};

type UploadedBusinessMedia = {
  publicUrl: string;
  storagePath: string;
};

const businessMediaBucketId = "business-media";
const supportedMediaTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type SupportedMediaType = (typeof supportedMediaTypes)[number];

const getPickerAspect = (kind: BusinessMediaKind): [number, number] => {
  if (kind === "cover") {
    return [16, 9];
  }

  return [1, 1];
};

const getMediaType = (asset: ImagePicker.ImagePickerAsset): SupportedMediaType => {
  if (typeof asset.mimeType === "string" && asset.mimeType.length > 0) {
    if (asset.mimeType === "image/jpg") {
      return "image/jpeg";
    }

    if (supportedMediaTypes.includes(asset.mimeType as SupportedMediaType)) {
      return asset.mimeType as SupportedMediaType;
    }

    throw new Error(`Unsupported business media type ${asset.mimeType}. Upload a JPEG, PNG, or WebP image.`);
  }

  return "image/jpeg";
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

const createStoragePath = (businessId: string, kind: BusinessMediaKind, mimeType: SupportedMediaType): string => {
  const extension = getExtension(mimeType);

  return `businesses/${businessId}/${kind}-${Date.now()}.${extension}`;
};

export const pickBusinessMediaAsync = async ({
  kind,
}: PickBusinessMediaParams): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload business media.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: getPickerAspect(kind),
    base64: true,
    mediaTypes: ["images"],
    quality: kind === "cover" ? 0.86 : 0.92,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
};

export const uploadBusinessMediaAsync = async ({
  businessId,
  kind,
  asset,
}: UploadBusinessMediaParams): Promise<UploadedBusinessMedia> => {
  const mimeType = getMediaType(asset);
  const storagePath = createStoragePath(businessId, kind, mimeType);
  const uploadBody = await readImageUploadBody({
    base64: asset.base64 ?? null,
    context: `${kind} image for business ${businessId}`,
    uri: asset.uri,
  });
  const { error } = await supabase.storage.from(businessMediaBucketId).upload(storagePath, uploadBody, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error !== null) {
    throw new Error(`Failed to upload ${kind} image for business ${businessId}: ${error.message}`);
  }

  const { data } = supabase.storage.from(businessMediaBucketId).getPublicUrl(storagePath);
  await verifyPublicImageUrlAsync({
    context: `${kind} image for business ${businessId}`,
    publicUrl: data.publicUrl,
  });

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
