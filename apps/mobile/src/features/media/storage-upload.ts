type ReadImageUploadBodyParams = {
  context: string;
  uri: string;
};

type VerifyPublicImageUrlParams = {
  context: string;
  publicUrl: string;
};

const readImageUploadBodyAsync = async ({
  context,
  uri,
}: ReadImageUploadBodyParams): Promise<ArrayBuffer> => {
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
