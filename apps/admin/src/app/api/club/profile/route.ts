import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import {
  mapClubProfileRecord,
  type ClubProfileClubRow,
  type ClubProfileMembershipRow,
} from "@/features/club-profile/read-model";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import type { ClubProfileUpdateResponse } from "@/features/club-profile/types";
import { createRouteHandlerClient } from "@/lib/supabase/server";

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || /^https?:\/\/.+/i.test(value), {
    message: "Use an absolute http or https URL.",
  });

const clubProfileUpdateSchema = z.object({
  address: z.string().trim().max(240),
  announcement: z.string().trim().max(400),
  clubId: z.string().uuid(),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Use a valid email address or leave the field empty.",
    }),
  instagramUrl: optionalUrlSchema,
  phone: z.string().trim().max(80),
  websiteUrl: optionalUrlSchema,
});

const normalizeOptionalText = (value: string): string | null => {
  const normalized = value.trim();

  return normalized.length === 0 ? null : normalized;
};

const fetchEditableMembershipAsync = async (
  supabase: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubProfileMembershipRow | null> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id,role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("status", "ACTIVE")
    .in("role", ["OWNER", "ORGANIZER"])
    .maybeSingle<ClubProfileMembershipRow>();

  if (error !== null) {
    throw new Error(`Failed to verify editable club membership ${clubId} for ${userId}: ${error.message}`);
  }

  return data;
};

export async function PATCH(request: Request) {
  const supabase = await createRouteHandlerClient();
  const access = await resolveAdminAccessAsync(supabase);

  if (access.area !== "club" || access.userId === null) {
    return NextResponse.json({ message: "Club organizer access is required." }, { status: 403 });
  }

  const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "club-profile-update");

  if (rateLimitResponse !== null) {
    return rateLimitResponse;
  }

  const parsedPayload = clubProfileUpdateSchema.safeParse(await request.json());

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        fieldErrors: parsedPayload.error.flatten().fieldErrors,
        message: "Club profile payload validation failed.",
      },
      { status: 400 }
    );
  }

  const payload = parsedPayload.data;
  const membership = await fetchEditableMembershipAsync(supabase, access.userId, payload.clubId);

  if (membership === null) {
    return NextResponse.json({ message: "This club profile cannot be edited by the current user." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("clubs")
    .update({
      address: normalizeOptionalText(payload.address),
      announcement: normalizeOptionalText(payload.announcement),
      contact_email: normalizeOptionalText(payload.contactEmail),
      instagram_url: normalizeOptionalText(payload.instagramUrl),
      phone: normalizeOptionalText(payload.phone),
      website_url: normalizeOptionalText(payload.websiteUrl),
    })
    .eq("id", payload.clubId)
    .select("id,name,city,university_name,contact_email,phone,address,website_url,instagram_url,announcement")
    .maybeSingle<ClubProfileClubRow>();

  if (error !== null) {
    throw new Error(`Failed to update club profile ${payload.clubId} for ${access.userId}: ${error.message}`);
  }

  if (data === null) {
    return NextResponse.json({ message: "Club profile was not updated." }, { status: 404 });
  }

  const response: ClubProfileUpdateResponse = {
    club: mapClubProfileRecord(data, membership),
    message: "Club profile updated.",
    status: "SUCCESS",
  };

  return NextResponse.json(response);
}
