import {
  FunctionsHttpError,
  FunctionsRelayError,
  type SupabaseClient,
} from "@supabase/supabase-js";

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
    imageUrl: string | null;
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
      image_url: payload.imageUrl,
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

export const updateAnnouncementAsync = async (
  supabase: SupabaseClient,
  payload: {
    announcementId: string;
    audience: AnnouncementAudience;
    body: string;
    clubId: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    endsAt: string | null;
    imageUrl: string | null;
    priority: number;
    startsAt: string;
    status: AnnouncementStatus;
    title: string;
  }
): Promise<AnnouncementTransportResult> => {
  const updateQuery = supabase
    .from("announcements")
    .update({
      audience: payload.audience,
      body: payload.body,
      cta_label: payload.ctaLabel,
      cta_url: payload.ctaUrl,
      ends_at: payload.endsAt,
      image_url: payload.imageUrl,
      priority: payload.priority,
      starts_at: payload.startsAt,
      status: payload.status,
      title: payload.title,
    })
    .eq("id", payload.announcementId);

  const scopedQuery = payload.clubId === null ? updateQuery.is("club_id", null) : updateQuery.eq("club_id", payload.clubId);
  const { data, error } = await scopedQuery.select("id").maybeSingle<AnnouncementInsertRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "UPDATE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: `Announcement ${payload.announcementId} was not updated.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  return {
    response: {
      message: `Announcement ${data.id} updated successfully.`,
      status: "SUCCESS",
    },
    status: 200,
  };
};

export const archiveAnnouncementAsync = async (
  supabase: SupabaseClient,
  payload: {
    announcementId: string;
    clubId: string | null;
  }
): Promise<AnnouncementTransportResult> => {
  const archiveQuery = supabase
    .from("announcements")
    .update({
      status: "ARCHIVED",
    })
    .eq("id", payload.announcementId);

  const scopedQuery = payload.clubId === null ? archiveQuery.is("club_id", null) : archiveQuery.eq("club_id", payload.clubId);
  const { data, error } = await scopedQuery.select("id").maybeSingle<AnnouncementInsertRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "ARCHIVE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: `Announcement ${payload.announcementId} was not archived.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  return {
    response: {
      message: `Announcement ${data.id} archived successfully.`,
      status: "SUCCESS",
    },
    status: 200,
  };
};

export const sendAnnouncementPushAsync = async (
  supabase: SupabaseClient,
  announcementId: string
): Promise<AnnouncementTransportResult> => {
  const invokeResult = await supabase.functions.invoke<AnnouncementMutationResponse>(
    "send-announcement-push",
    {
      body: {
        announcementId,
      },
    }
  );

  if (invokeResult.error !== null) {
    if (
      invokeResult.error instanceof FunctionsHttpError ||
      invokeResult.error instanceof FunctionsRelayError
    ) {
      const response = invokeResult.error.context;

      if (response instanceof Response) {
        let responseBody: Partial<AnnouncementMutationResponse> | null = null;

        try {
          responseBody = (await response.clone().json()) as Partial<AnnouncementMutationResponse>;
        } catch {
          responseBody = null;
        }

        return {
          response: {
            message:
              typeof responseBody?.message === "string"
                ? responseBody.message
                : invokeResult.error.message,
            notificationsCreated:
              typeof responseBody?.notificationsCreated === "number"
                ? responseBody.notificationsCreated
                : undefined,
            notificationsFailed:
              typeof responseBody?.notificationsFailed === "number"
                ? responseBody.notificationsFailed
                : undefined,
            notificationsSent:
              typeof responseBody?.notificationsSent === "number"
                ? responseBody.notificationsSent
                : undefined,
            status:
              typeof responseBody?.status === "string"
                ? responseBody.status
                : "FUNCTION_ERROR",
          },
          status: response.status,
        };
      }
    }

    return {
      response: {
        message: invokeResult.error.message,
        status: "FUNCTION_ERROR",
      },
      status: 502,
    };
  }

  return {
    response: {
      message:
        typeof invokeResult.data?.message === "string"
          ? invokeResult.data.message
          : "Announcement push request completed.",
      notificationsCreated: invokeResult.data?.notificationsCreated,
      notificationsFailed: invokeResult.data?.notificationsFailed,
      notificationsSent: invokeResult.data?.notificationsSent,
      status: typeof invokeResult.data?.status === "string" ? invokeResult.data.status : null,
    },
    status: 200,
  };
};
