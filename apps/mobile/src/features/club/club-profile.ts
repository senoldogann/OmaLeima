import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { clubDashboardQueryKey } from "@/features/club/club-dashboard";
import { supabase } from "@/lib/supabase";

type ClubProfileDraft = {
  announcement: string;
  clubId: string;
  contactEmail: string;
  coverImageUrl: string;
  logoUrl: string;
};

type UpdateClubProfileVariables = {
  draft: ClubProfileDraft;
  userId: string;
};

type UpdateClubProfileResult = {
  clubId: string;
};

const trimOptional = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
};

const updateClubProfileAsync = async ({
  draft,
  userId,
}: UpdateClubProfileVariables): Promise<UpdateClubProfileResult> => {
  const { data, error } = await supabase
    .from("clubs")
    .update({
      announcement: trimOptional(draft.announcement),
      contact_email: trimOptional(draft.contactEmail),
      cover_image_url: trimOptional(draft.coverImageUrl),
      logo_url: trimOptional(draft.logoUrl),
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
