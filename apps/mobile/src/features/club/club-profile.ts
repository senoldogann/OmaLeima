import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { clubDashboardQueryKey } from "@/features/club/club-dashboard";
import { removeReplacedPublicStorageObjectAsync } from "@/features/media/storage-cleanup";
import { supabase } from "@/lib/supabase";

type ClubProfileDraft = {
  address: string;
  announcement: string;
  clubId: string;
  contactEmail: string;
  coverImageUrl: string;
  instagramUrl: string;
  logoUrl: string;
  phone: string;
  websiteUrl: string;
};

type UpdateClubProfileVariables = {
  draft: ClubProfileDraft;
  userId: string;
};

type UpdateClubProfileResult = {
  clubId: string;
};

type ClubMediaLookupRow = {
  cover_image_url: string | null;
  id: string;
  logo_url: string | null;
};

const eventMediaBucketId = "event-media";

const trimOptional = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
};

const updateClubProfileAsync = async ({
  draft,
  userId,
}: UpdateClubProfileVariables): Promise<UpdateClubProfileResult> => {
  const { data: existingClub, error: existingError } = await supabase
    .from("clubs")
    .select("id,cover_image_url,logo_url")
    .eq("id", draft.clubId)
    .maybeSingle<ClubMediaLookupRow>();

  if (existingError !== null) {
    throw new Error(`Failed to load current club media ${draft.clubId} for ${userId}: ${existingError.message}`);
  }

  if (existingClub === null) {
    throw new Error(`Club profile ${draft.clubId} was not found for ${userId}.`);
  }

  const { data, error } = await supabase
    .from("clubs")
    .update({
      address: trimOptional(draft.address),
      announcement: trimOptional(draft.announcement),
      contact_email: trimOptional(draft.contactEmail),
      cover_image_url: trimOptional(draft.coverImageUrl),
      instagram_url: trimOptional(draft.instagramUrl),
      logo_url: trimOptional(draft.logoUrl),
      phone: trimOptional(draft.phone),
      website_url: trimOptional(draft.websiteUrl),
    })
    .eq("id", draft.clubId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) {
    throw new Error(`Failed to update club profile ${draft.clubId} for ${userId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Club profile ${draft.clubId} was not updated for ${userId}.`);
  }

  await Promise.all([
    removeReplacedPublicStorageObjectAsync({
      bucketId: eventMediaBucketId,
      context: `club ${draft.clubId} cover`,
      newPublicUrl: trimOptional(draft.coverImageUrl),
      oldPublicUrl: existingClub.cover_image_url,
    }),
    removeReplacedPublicStorageObjectAsync({
      bucketId: eventMediaBucketId,
      context: `club ${draft.clubId} logo`,
      newPublicUrl: trimOptional(draft.logoUrl),
      oldPublicUrl: existingClub.logo_url,
    }),
  ]);

  return {
    clubId: data.id,
  };
};

export const useUpdateClubProfileMutation = (): UseMutationResult<
  UpdateClubProfileResult,
  Error,
  UpdateClubProfileVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClubProfileAsync,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: clubDashboardQueryKey(variables.userId),
      });
    },
  });
};
