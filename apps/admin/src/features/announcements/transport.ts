import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import type {
  AnnouncementAudience,
  AnnouncementMutationResponse,
  AnnouncementStatus,
} from "@/features/announcements/types";

type AnnouncementTransportResult = {
  response: AnnouncementMutationResponse;
  status: number;
};

type AnnouncementInsertRow = {
  id: string;
};

export const requireAnnouncementAccessAsync = async (
  supabase: SupabaseClient
): Promise<AnnouncementTransportResult | null> => {
  const access = await resolveAdminAccessAsync(supabase);

  if (access.area === "admin" || access.area === "club") {
    return null;
  }

  return {
    response: {
      message: "Sign in with a platform admin or club organizer account before publishing announcements.",
      status: "ANNOUNCEMENT_NOT_ALLOWED",
    },
    status: access.area === "anonymous" ? 401 : 403,
  };
};

export const createAnnouncementAsync = async (
  supabase: SupabaseClient,
  payload: {
    audience: AnnouncementAudience;
    body: string;
    clubId: string | null;
    createdBy: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    endsAt: string | null;
    priority: number;
    startsAt: string;
    status: AnnouncementStatus;
    title: string;
  }
): Promise<AnnouncementTransportResult> => {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      audience: payload.audience,
      body: payload.body,
      club_id: payload.clubId,
      created_by: payload.createdBy,
      cta_label: payload.ctaLabel,
      cta_url: payload.ctaUrl,
      ends_at: payload.endsAt,
      priority: payload.priority,
      starts_at: payload.startsAt,
      status: payload.status,
      title: payload.title,
    })
    .select("id")
    .single<AnnouncementInsertRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "CREATE_ERROR",
      },
      status: 502,
    };
  }

  return {
    response: {
      message: `Announcement ${data.id} saved successfully.`,
      status: "SUCCESS",
    },
    status: 200,
  };
};
