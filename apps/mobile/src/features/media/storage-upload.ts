type ReadImageUploadBodyParams = {
  base64: string | null;
  context: string;
  uri: string;
};

type VerifyPublicImageUrlParams = {
  context: string;
  publicUrl: string;
};

const decodeBase64ToArrayBuffer = ({
  base64,
  context,
}: {
  base64: string;
  context: string;
}): ArrayBuffer => {
  const decodeBase64 = (globalThis as { atob?: (value: string) => string }).atob;

  if (typeof decodeBase64 !== "function") {
    throw new Error(`Cannot decode selected image for ${context}: base64 decoder is unavailable.`);
  }

  const binaryString = decodeBase64(base64);
  const uploadBody = new ArrayBuffer(binaryString.length);
  const uploadBytes = new Uint8Array(uploadBody);

  for (let index = 0; index < binaryString.length; index += 1) {
    uploadBytes[index] = binaryString.charCodeAt(index);
  }

  if (uploadBody.byteLength === 0) {
    throw new Error(`Selected image for ${context} produced an empty base64 upload body.`);
  }

  return uploadBody;
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

export const verifyPublicImageUrlAsync = async ({
  context,
  publicUrl,
}: VerifyPublicImageUrlParams): Promise<void> => {
  const response = await fetch(publicUrl, {
    method: "HEAD",
  });

  if (!response.ok) {
    throw new Error(`Uploaded image for ${context} is not publicly readable. URL: ${publicUrl}. Status: ${response.status}.`);
  }

  const rawContentLength = response.headers.get("content-length");

  if (rawContentLength === null) {
    return;
  }

  const contentLength = Number.parseInt(rawContentLength, 10);

  if (Number.isNaN(contentLength)) {
    throw new Error(`Uploaded image for ${context} returned an invalid content-length. URL: ${publicUrl}. Header: ${rawContentLength}.`);
  }

  if (contentLength <= 0) {
    throw new Error(`Uploaded image for ${context} is empty in storage. URL: ${publicUrl}.`);
  }
};
