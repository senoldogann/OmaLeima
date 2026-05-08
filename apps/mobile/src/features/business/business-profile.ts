import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { businessHomeOverviewQueryKey } from "@/features/business/business-home";
import type { BusinessMembershipSummary } from "@/features/business/types";
import { removeReplacedPublicStorageObjectAsync } from "@/features/media/storage-cleanup";

export type BusinessProfileDraft = {
  businessId: string;
  userId: string;
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  websiteUrl: string;
  instagramUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  yTunnus: string;
  contactPersonName: string;
  openingHours: string;
  announcement: string;
};

type BusinessProfileUpdatePayload = {
  name: string;
  contact_email: string;
  phone: string | null;
  address: string;
  city: string;
  website_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  y_tunnus: string | null;
  contact_person_name: string | null;
  opening_hours: string | null;
  announcement: string | null;
};

type BusinessMediaLookupRow = {
  cover_image_url: string | null;
  id: string;
  logo_url: string | null;
};

const businessMediaBucketId = "business-media";

const trimOptional = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
};

const createUpdatePayload = (draft: BusinessProfileDraft): BusinessProfileUpdatePayload => ({
  name: draft.name.trim(),
  contact_email: draft.contactEmail.trim(),
  phone: trimOptional(draft.phone),
  address: draft.address.trim(),
  city: draft.city.trim(),
  website_url: trimOptional(draft.websiteUrl),
  instagram_url: trimOptional(draft.instagramUrl),
  logo_url: trimOptional(draft.logoUrl),
  cover_image_url: trimOptional(draft.coverImageUrl),
  y_tunnus: trimOptional(draft.yTunnus),
  contact_person_name: trimOptional(draft.contactPersonName),
  opening_hours: trimOptional(draft.openingHours),
  announcement: trimOptional(draft.announcement),
});

export const createBusinessProfileDraft = (
  membership: BusinessMembershipSummary,
  userId: string
): BusinessProfileDraft => ({
  businessId: membership.businessId,
  userId,
  name: membership.businessName,
  contactEmail: membership.contactEmail,
  phone: membership.phone ?? "",
  address: membership.address,
  city: membership.city,
  websiteUrl: membership.websiteUrl ?? "",
  instagramUrl: membership.instagramUrl ?? "",
  logoUrl: membership.logoUrl ?? "",
  coverImageUrl: membership.coverImageUrl ?? "",
  yTunnus: membership.yTunnus ?? "",
  contactPersonName: membership.contactPersonName ?? "",
  openingHours: membership.openingHours ?? "",
  announcement: membership.announcement ?? "",
});

export const canManageBusinessProfile = (membership: BusinessMembershipSummary): boolean =>
  membership.role === "OWNER" || membership.role === "MANAGER";

const updateBusinessProfileAsync = async (draft: BusinessProfileDraft): Promise<void> => {
  const payload = createUpdatePayload(draft);

  if (payload.name.length < 2) {
    throw new Error("Business name must contain at least 2 characters.");
  }

  if (payload.contact_email.length < 3 || !payload.contact_email.includes("@")) {
    throw new Error("Business contact email must be a valid email address.");
  }

  if (payload.address.length < 3) {
    throw new Error("Business address must contain at least 3 characters.");
  }

  if (payload.city.length < 2) {
    throw new Error("Business city must contain at least 2 characters.");
  }

  const { data: existingBusiness, error: existingError } = await supabase
    .from("businesses")
    .select("id,cover_image_url,logo_url")
    .eq("id", draft.businessId)
    .maybeSingle<BusinessMediaLookupRow>();

  if (existingError !== null) {
    throw new Error(`Failed to load current business media ${draft.businessId}: ${existingError.message}`);
  }

  if (existingBusiness === null) {
    throw new Error(`Business profile ${draft.businessId} was not found.`);
  }

  const { error } = await supabase.from("businesses").update(payload).eq("id", draft.businessId);

  if (error !== null) {
    throw new Error(`Failed to update business profile ${draft.businessId}: ${error.message}`);
  }

  await Promise.all([
    removeReplacedPublicStorageObjectAsync({
      bucketId: businessMediaBucketId,
      context: `business ${draft.businessId} cover`,
      newPublicUrl: payload.cover_image_url,
      oldPublicUrl: existingBusiness.cover_image_url,
    }),
    removeReplacedPublicStorageObjectAsync({
      bucketId: businessMediaBucketId,
      context: `business ${draft.businessId} logo`,
      newPublicUrl: payload.logo_url,
      oldPublicUrl: existingBusiness.logo_url,
    }),
  ]);
};

export const useUpdateBusinessProfileMutation = (): UseMutationResult<void, Error, BusinessProfileDraft> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft) => updateBusinessProfileAsync(draft),
    onSuccess: async (_, draft) => {
      await queryClient.invalidateQueries({
        queryKey: businessHomeOverviewQueryKey(draft.userId),
      });
    },
  });
};
