import { verifyPublicImageUrlAsync } from "@/features/media/remote-image-health";

type ReadImageUploadBodyParams = {
  base64: string | null;
  context: string;
  uri: string;
};

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const base64Lookup = new Map<string, number>([...base64Alphabet].map((character, index) => [character, index] as const));

const normalizeBase64Input = (base64: string, context: string): string => {
  const dataUriSeparatorIndex = base64.indexOf(",");
  const rawBase64 = dataUriSeparatorIndex >= 0 ? base64.slice(dataUriSeparatorIndex + 1) : base64;
  const normalizedBase64 = rawBase64.replace(/\s/g, "");

  if (normalizedBase64.length === 0) {
    throw new Error(`Selected image for ${context} produced an empty base64 string.`);
  }

  if (normalizedBase64.length % 4 === 1) {
    throw new Error(`Selected image for ${context} has invalid base64 length.`);
  }

  return normalizedBase64;
};

const getBase64Value = (character: string, context: string): number => {
  const value = base64Lookup.get(character);

  if (typeof value === "undefined") {
    throw new Error(`Selected image for ${context} contains invalid base64 character.`);
  }

  return value;
};

const countBase64Padding = (base64: string): number => {
  if (base64.endsWith("==")) {
    return 2;
  }

  if (base64.endsWith("=")) {
    return 1;
  }

  return 0;
};

const decodeBase64ToArrayBuffer = ({
  base64,
  context,
}: {
  base64: string;
  context: string;
}): ArrayBuffer => {
  const normalizedBase64 = normalizeBase64Input(base64, context);
  const padding = countBase64Padding(normalizedBase64);
  const decodedByteLength = Math.floor((normalizedBase64.length * 3) / 4) - padding;
  const uploadBytes = new Uint8Array(decodedByteLength);
  let byteIndex = 0;

  for (let index = 0; index < normalizedBase64.length; index += 4) {
    const first = getBase64Value(normalizedBase64[index] ?? "", context);
    const second = getBase64Value(normalizedBase64[index + 1] ?? "", context);
    const thirdCharacter = normalizedBase64[index + 2] ?? "=";
    const fourthCharacter = normalizedBase64[index + 3] ?? "=";
    const third = thirdCharacter === "=" ? 0 : getBase64Value(thirdCharacter, context);
    const fourth = fourthCharacter === "=" ? 0 : getBase64Value(fourthCharacter, context);
    const triplet = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (byteIndex < decodedByteLength) {
      uploadBytes[byteIndex] = (triplet >> 16) & 255;
      byteIndex += 1;
    }

    if (byteIndex < decodedByteLength) {
      uploadBytes[byteIndex] = (triplet >> 8) & 255;
      byteIndex += 1;
    }

    if (byteIndex < decodedByteLength) {
      uploadBytes[byteIndex] = triplet & 255;
      byteIndex += 1;
    }
  }

  if (uploadBytes.byteLength === 0) {
    throw new Error(`Selected image for ${context} produced an empty base64 upload body.`);
  }

  return uploadBytes.buffer.slice(uploadBytes.byteOffset, uploadBytes.byteOffset + uploadBytes.byteLength);
};

const readImageUploadBodyAsync = async ({
  base64,
  context,
  uri,
}: ReadImageUploadBodyParams): Promise<ArrayBuffer> => {
  if (base64 !== null && base64.trim().length > 0) {
    return decodeBase64ToArrayBuffer({
      base64,
      context,
    });
  }

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`Failed to read selected image for ${context}. URI: ${uri}. Status: ${response.status}.`);
  }

  const uploadBody = await response.arrayBuffer();

  if (uploadBody.byteLength === 0) {
    throw new Error(`Selected image for ${context} produced an empty upload body. URI: ${uri}.`);
  }

  return uploadBody;
};

export const readImageUploadBody = readImageUploadBodyAsync;
export { verifyPublicImageUrlAsync };
