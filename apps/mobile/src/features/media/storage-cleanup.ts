import { publicEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type PublicStoragePathParams = {
  bucketId: string;
  publicUrl: string | null;
};

type RemoveStorageObjectParams = PublicStoragePathParams & {
  context: string;
};

type RemoveReplacedStorageObjectParams = {
  bucketId: string;
  context: string;
  newPublicUrl: string | null;
  oldPublicUrl: string | null;
};

const createPublicPathSegment = (bucketId: string): string => `/storage/v1/object/public/${bucketId}/`;

export const readPublicStoragePath = ({ bucketId, publicUrl }: PublicStoragePathParams): string | null => {
  if (publicUrl === null || publicUrl.trim().length === 0) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(publicUrl);
  } catch {
    return null;
  }

  const supabaseUrl = new URL(publicEnv.EXPO_PUBLIC_SUPABASE_URL);

  if (parsedUrl.host !== supabaseUrl.host) {
    return null;
  }

  const publicPathSegment = createPublicPathSegment(bucketId);
  const segmentIndex = parsedUrl.pathname.indexOf(publicPathSegment);

  if (segmentIndex < 0) {
    return null;
  }

  const encodedPath = parsedUrl.pathname.slice(segmentIndex + publicPathSegment.length);

  if (encodedPath.length === 0) {
    return null;
  }

  return decodeURIComponent(encodedPath);
};

export const removePublicStorageObjectByUrlAsync = async ({
  bucketId,
  context,
  publicUrl,
}: RemoveStorageObjectParams): Promise<boolean> => {
  const storagePath = readPublicStoragePath({
    bucketId,
    publicUrl,
  });

  if (storagePath === null) {
    return false;
  }

  const { error } = await supabase.storage.from(bucketId).remove([storagePath]);

  if (error !== null) {
    throw new Error(`Failed to remove ${context} storage object ${bucketId}/${storagePath}: ${error.message}`);
  }

  return true;
};

export const removeReplacedPublicStorageObjectAsync = async ({
  bucketId,
  context,
  newPublicUrl,
  oldPublicUrl,
}: RemoveReplacedStorageObjectParams): Promise<boolean> => {
  if (oldPublicUrl === null || oldPublicUrl === newPublicUrl) {
    return false;
  }

  return removePublicStorageObjectByUrlAsync({
    bucketId,
    context,
    publicUrl: oldPublicUrl,
  });
};
