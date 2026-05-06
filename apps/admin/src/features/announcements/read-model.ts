import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  AnnouncementClubOption,
  AnnouncementRecord,
  AnnouncementSnapshot,
  AnnouncementStatus,
  AnnouncementAudience,
} from "@/features/announcements/types";

type AnnouncementRow = {
  audience: AnnouncementAudience;
  body: string;
  club_id: string | null;
  created_at: string;
  created_by: string;
  cta_label: string | null;
  cta_url: string | null;
  ends_at: string | null;
  id: string;
  image_url: string | null;
  priority: number;
  starts_at: string;
  status: AnnouncementStatus;
  title: string;
  club: {
    name: string;
  } | null;
};

type ProfileRow = {
  email: string;
  id: string;
};

type NotificationRow = {
  payload: {
    announcementId?: string;
  } | null;
  status: "FAILED" | "READ" | "SENT";
};

const latestAnnouncementLimit = 12;

const fetchProfileEmailsByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", ids)
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load announcement creator emails: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.email]));
};

const readNotificationAnnouncementId = (payload: NotificationRow["payload"]): string | null =>
  typeof payload?.announcementId === "string" ? payload.announcementId : null;

const buildPushDeliveryStatusByAnnouncementId = (
  notificationRows: NotificationRow[]
): Map<string, AnnouncementRecord["pushDeliveryStatus"]> => {
  const deliveryStateByAnnouncementId = new Map<string, { hasFailure: boolean; hasSuccess: boolean }>();

  notificationRows.forEach((row) => {
    const announcementId = readNotificationAnnouncementId(row.payload);

    if (announcementId === null) {
      return;
    }

    const currentState = deliveryStateByAnnouncementId.get(announcementId) ?? {
      hasFailure: false,
      hasSuccess: false,
    };

    if (row.status === "SENT" || row.status === "READ") {
      currentState.hasSuccess = true;
    }

    if (row.status === "FAILED") {
      currentState.hasFailure = true;
    }

    deliveryStateByAnnouncementId.set(announcementId, currentState);
  });

  return new Map<string, AnnouncementRecord["pushDeliveryStatus"]>(
    Array.from(deliveryStateByAnnouncementId.entries()).map(([announcementId, deliveryState]) => {
      if (deliveryState.hasSuccess && deliveryState.hasFailure) {
        return [announcementId, "PARTIAL"];
      }

      if (deliveryState.hasSuccess) {
        return [announcementId, "SENT"];
      }

      return [announcementId, "FAILED"];
    })
  );
};

const mapRows = (
  rows: AnnouncementRow[],
  creatorEmails: Map<string, string>,
  pushDeliveryStatusByAnnouncementId: Map<string, AnnouncementRecord["pushDeliveryStatus"]>
): AnnouncementRecord[] =>
  rows.map((row) => ({
    announcementId: row.id,
    audience: row.audience,
    body: row.body,
    clubId: row.club_id,
    clubName: row.club?.name ?? null,
    createdAt: row.created_at,
    createdByEmail: creatorEmails.get(row.created_by) ?? null,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    endsAt: row.ends_at,
    imageUrl: row.image_url,
    priority: row.priority,
    pushDeliveryStatus: pushDeliveryStatusByAnnouncementId.get(row.id) ?? "NOT_SENT",
    startsAt: row.starts_at,
    status: row.status,
    title: row.title,
  }));

const fetchAnnouncementsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[] | null
): Promise<AnnouncementRecord[]> => {
  let query = supabase
    .from("announcements")
    .select(
      `
      id,
      club_id,
      created_by,
      audience,
      title,
      body,
      cta_label,
      cta_url,
      image_url,
      status,
      priority,
      starts_at,
      ends_at,
      created_at,
      club:clubs(name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(latestAnnouncementLimit);

  if (clubIds !== null) {
    if (clubIds.length === 0) {
      return [];
    }

    query = query.in("club_id", clubIds);
  }

  const { data, error } = await query.returns<AnnouncementRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load announcements: ${error.message}`);
  }

  const creatorEmails = await fetchProfileEmailsByIdsAsync(
    supabase,
    Array.from(new Set<string>(data.map((row) => row.created_by)))
  );
  const announcementIds = data.map((row) => row.id);
  const pushDeliveryStatusByAnnouncementId =
    announcementIds.length === 0
      ? new Map<string, AnnouncementRecord["pushDeliveryStatus"]>()
      : await (async (): Promise<Map<string, AnnouncementRecord["pushDeliveryStatus"]>> => {
        const { data: notificationRows, error: notificationError } = await supabase
          .from("notifications")
          .select("status,payload")
          .eq("type", "ANNOUNCEMENT")
          .in("status", ["FAILED", "SENT", "READ"])
          .returns<NotificationRow[]>();

        if (notificationError !== null) {
          throw new Error(`Failed to load announcement push delivery status: ${notificationError.message}`);
        }

        return buildPushDeliveryStatusByAnnouncementId(notificationRows);
      })();

  return mapRows(data, creatorEmails, pushDeliveryStatusByAnnouncementId);
};

export const fetchAdminAnnouncementsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<AnnouncementSnapshot> => ({
  announcements: await fetchAnnouncementsAsync(supabase, null),
  clubOptions: [],
  scope: "ADMIN",
});

export const fetchClubAnnouncementsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<AnnouncementSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const clubOptions: AnnouncementClubOption[] = context.memberships
    .filter((membership) => membership.canCreateEvents)
    .map((membership) => ({
      clubId: membership.clubId,
      clubName: membership.clubName,
    }));

  return {
    announcements: await fetchAnnouncementsAsync(
      supabase,
      clubOptions.map((club) => club.clubId)
    ),
    clubOptions,
    scope: "CLUB",
  };
};
