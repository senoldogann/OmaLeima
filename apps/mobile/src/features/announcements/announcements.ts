import { useEffect } from "react";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type ActiveAnnouncement = {
  announcementId: string;
  body: string;
  clubId: string | null;
  clubName: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  priority: number;
  startsAt: string;
  title: string;
};

export type AnnouncementFeedItem = ActiveAnnouncement & {
  impressionSeenCount: number;
  isPushEnabled: boolean;
  isRead: boolean;
  preferenceId: string | null;
  sourceType: AnnouncementSourceType;
};

export type AnnouncementSourceType = "CLUB" | "PLATFORM";

type AnnouncementRow = {
  body: string;
  club_id: string | null;
  club: {
    name: string;
  } | null;
  cta_label: string | null;
  cta_url: string | null;
  id: string;
  image_url: string | null;
  priority: number;
  starts_at: string;
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  title: string;
};

type AnnouncementAcknowledgementRow = {
  announcement_id: string;
};

type AnnouncementPreferenceRow = {
  club_id: string | null;
  id: string;
  push_enabled: boolean;
  source_type: AnnouncementSourceType;
};

type AnnouncementImpressionRow = {
  announcement_id: string;
  seen_count: number;
};

type UseActiveAnnouncementsQueryParams = {
  isEnabled: boolean;
  userId: string;
};

type UseAnnouncementDetailQueryParams = UseActiveAnnouncementsQueryParams & {
  announcementId: string;
};

type AnnouncementRealtimeInvalidationParams = {
  isEnabled: boolean;
  userId: string;
};

export const activeAnnouncementsQueryKey = (userId: string) => ["active-announcements", userId] as const;
export const announcementFeedQueryKey = (userId: string) => ["announcement-feed", userId] as const;
export const announcementDetailQueryKey = (userId: string, announcementId: string) =>
  ["announcement-detail", userId, announcementId] as const;

const announcementFreshnessIntervalMs = 60_000;

const getAnnouncementSourceType = (clubId: string | null): AnnouncementSourceType =>
  clubId === null ? "PLATFORM" : "CLUB";

const findPreferenceForAnnouncement = (
  row: AnnouncementRow,
  preferenceRows: AnnouncementPreferenceRow[]
): AnnouncementPreferenceRow | null => {
  const sourceType = getAnnouncementSourceType(row.club_id);

  return preferenceRows.find((preference) => {
    if (preference.source_type !== sourceType) {
      return false;
    }

    if (sourceType === "PLATFORM") {
      return preference.club_id === null;
    }

    return preference.club_id === row.club_id;
  }) ?? null;
};

const mapAnnouncements = (rows: AnnouncementRow[], acknowledgedIds: Set<string>): ActiveAnnouncement[] =>
  rows
    .filter((row) => row.status === "PUBLISHED" && !acknowledgedIds.has(row.id))
    .map((row) => ({
      announcementId: row.id,
      body: row.body,
      clubId: row.club_id,
      clubName: row.club?.name ?? null,
      ctaLabel: row.cta_label,
      ctaUrl: row.cta_url,
      imageUrl: row.image_url,
      priority: row.priority,
      startsAt: row.starts_at,
      title: row.title,
    }));

const mapAnnouncementFeedItems = (
  rows: AnnouncementRow[],
  acknowledgedIds: Set<string>,
  preferenceRows: AnnouncementPreferenceRow[],
  impressionRows: AnnouncementImpressionRow[]
): AnnouncementFeedItem[] =>
  rows
    .filter((row) => row.status === "PUBLISHED")
    .map((row) => {
      const preference = findPreferenceForAnnouncement(row, preferenceRows);
      const impression = impressionRows.find((impressionRow) => impressionRow.announcement_id === row.id) ?? null;

      return {
        announcementId: row.id,
        body: row.body,
        clubId: row.club_id,
        clubName: row.club?.name ?? null,
        ctaLabel: row.cta_label,
        ctaUrl: row.cta_url,
        impressionSeenCount: impression?.seen_count ?? 0,
        imageUrl: row.image_url,
        isPushEnabled: preference?.push_enabled ?? true,
        isRead: acknowledgedIds.has(row.id),
        preferenceId: preference?.id ?? null,
        priority: row.priority,
        sourceType: getAnnouncementSourceType(row.club_id),
        startsAt: row.starts_at,
        title: row.title,
      };
    });

const fetchActiveAnnouncementsAsync = async (userId: string): Promise<ActiveAnnouncement[]> => {
  const nowIso = new Date().toISOString();
  const [{ data: announcementRows, error: announcementError }, { data: acknowledgementRows, error: acknowledgementError }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select(
          `
          id,
          club_id,
          title,
          body,
          cta_label,
          cta_url,
          image_url,
          status,
          priority,
          starts_at,
          club:clubs(name)
        `
        )
        .eq("status", "PUBLISHED")
        .eq("show_as_popup", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(5)
        .returns<AnnouncementRow[]>(),
      supabase
        .from("announcement_acknowledgements")
        .select("announcement_id")
        .eq("user_id", userId)
        .returns<AnnouncementAcknowledgementRow[]>(),
    ]);

  if (announcementError !== null) {
    throw new Error(`Failed to load active announcements for ${userId}: ${announcementError.message}`);
  }

  if (acknowledgementError !== null) {
    throw new Error(`Failed to load announcement acknowledgements for ${userId}: ${acknowledgementError.message}`);
  }

  return mapAnnouncements(
    announcementRows,
    new Set<string>(acknowledgementRows.map((row) => row.announcement_id))
  );
};

const fetchAnnouncementFeedAsync = async (userId: string): Promise<AnnouncementFeedItem[]> => {
  const nowIso = new Date().toISOString();
  const [
    { data: announcementRows, error: announcementError },
    { data: acknowledgementRows, error: acknowledgementError },
    { data: preferenceRows, error: preferenceError },
    { data: impressionRows, error: impressionError },
  ] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        `
          id,
          club_id,
          title,
          body,
          cta_label,
          cta_url,
          image_url,
          status,
          priority,
          starts_at,
          club:clubs(name)
        `
      )
      .eq("status", "PUBLISHED")
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("priority", { ascending: false })
      .order("starts_at", { ascending: false })
      .limit(15)
      .returns<AnnouncementRow[]>(),
    supabase
      .from("announcement_acknowledgements")
      .select("announcement_id")
      .eq("user_id", userId)
      .returns<AnnouncementAcknowledgementRow[]>(),
    supabase
      .from("announcement_notification_preferences")
      .select("id,source_type,club_id,push_enabled")
      .eq("user_id", userId)
      .returns<AnnouncementPreferenceRow[]>(),
    supabase
      .from("announcement_impressions")
      .select("announcement_id,seen_count")
      .eq("user_id", userId)
      .returns<AnnouncementImpressionRow[]>(),
  ]);

  if (announcementError !== null) {
    throw new Error(`Failed to load announcement feed for ${userId}: ${announcementError.message}`);
  }

  if (acknowledgementError !== null) {
    throw new Error(`Failed to load announcement feed acknowledgements for ${userId}: ${acknowledgementError.message}`);
  }

  if (preferenceError !== null) {
    throw new Error(`Failed to load announcement notification preferences for ${userId}: ${preferenceError.message}`);
  }

  if (impressionError !== null) {
    throw new Error(`Failed to load announcement impressions for ${userId}: ${impressionError.message}`);
  }

  return mapAnnouncementFeedItems(
    announcementRows,
    new Set<string>(acknowledgementRows.map((row) => row.announcement_id)),
    preferenceRows,
    impressionRows
  );
};

const fetchAnnouncementDetailAsync = async (
  userId: string,
  announcementId: string
): Promise<AnnouncementFeedItem | null> => {
  const nowIso = new Date().toISOString();
  const [
    { data: announcementRows, error: announcementError },
    { data: acknowledgementRows, error: acknowledgementError },
    { data: preferenceRows, error: preferenceError },
    { data: impressionRows, error: impressionError },
  ] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        `
          id,
          club_id,
          title,
          body,
          cta_label,
          cta_url,
          image_url,
          status,
          priority,
          starts_at,
          club:clubs(name)
        `
      )
      .eq("id", announcementId)
      .eq("status", "PUBLISHED")
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .limit(1)
      .returns<AnnouncementRow[]>(),
    supabase
      .from("announcement_acknowledgements")
      .select("announcement_id")
      .eq("user_id", userId)
      .eq("announcement_id", announcementId)
      .returns<AnnouncementAcknowledgementRow[]>(),
    supabase
      .from("announcement_notification_preferences")
      .select("id,source_type,club_id,push_enabled")
      .eq("user_id", userId)
      .returns<AnnouncementPreferenceRow[]>(),
    supabase
      .from("announcement_impressions")
      .select("announcement_id,seen_count")
      .eq("user_id", userId)
      .eq("announcement_id", announcementId)
      .returns<AnnouncementImpressionRow[]>(),
  ]);

  if (announcementError !== null) {
    throw new Error(`Failed to load announcement detail ${announcementId} for ${userId}: ${announcementError.message}`);
  }

  if (acknowledgementError !== null) {
    throw new Error(`Failed to load announcement detail acknowledgement ${announcementId} for ${userId}: ${acknowledgementError.message}`);
  }

  if (preferenceError !== null) {
    throw new Error(`Failed to load announcement detail preferences ${announcementId} for ${userId}: ${preferenceError.message}`);
  }

  if (impressionError !== null) {
    throw new Error(`Failed to load announcement detail impressions ${announcementId} for ${userId}: ${impressionError.message}`);
  }

  const [announcement] = mapAnnouncementFeedItems(
    announcementRows,
    new Set<string>(acknowledgementRows.map((row) => row.announcement_id)),
    preferenceRows,
    impressionRows
  );

  return announcement ?? null;
};

const recordAnnouncementImpressionsAsync = async ({
  announcementIds,
  userId: _userId,
}: {
  announcementIds: string[];
  userId: string;
}): Promise<void> => {
  if (announcementIds.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("record_announcement_impressions", {
    p_announcement_ids: announcementIds,
  });

  if (error !== null) {
    throw new Error(`Failed to record announcement impressions: ${error.message}`);
  }
};

const acknowledgeAnnouncementAsync = async ({
  announcementId,
}: {
  announcementId: string;
  userId: string;
}): Promise<void> => {
  const { data, error } = await supabase.rpc("acknowledge_announcement_atomic", {
    p_announcement_id: announcementId,
  });

  if (error !== null) {
    throw new Error(`Failed to acknowledge announcement ${announcementId}: ${error.message}`);
  }

  if (data !== "SUCCESS") {
    throw new Error(`Failed to acknowledge announcement ${announcementId}: ${String(data)}`);
  }
};

const findExistingPreferenceAsync = async ({
  clubId,
  sourceType,
  userId,
}: {
  clubId: string | null;
  sourceType: AnnouncementSourceType;
  userId: string;
}): Promise<AnnouncementPreferenceRow | null> => {
  let query = supabase
    .from("announcement_notification_preferences")
    .select("id,source_type,club_id,push_enabled")
    .eq("user_id", userId)
    .eq("source_type", sourceType);

  query = sourceType === "PLATFORM" ? query.is("club_id", null) : query.eq("club_id", clubId);

  const { data, error } = await query.maybeSingle<AnnouncementPreferenceRow>();

  if (error !== null) {
    throw new Error(`Failed to read announcement notification preference for ${userId}: ${error.message}`);
  }

  return data;
};

const setAnnouncementNotificationPreferenceAsync = async ({
  clubId,
  pushEnabled,
  sourceType,
  userId,
}: {
  clubId: string | null;
  pushEnabled: boolean;
  sourceType: AnnouncementSourceType;
  userId: string;
}): Promise<void> => {
  const existingPreference = await findExistingPreferenceAsync({
    clubId,
    sourceType,
    userId,
  });

  if (existingPreference === null) {
    const { error } = await supabase
      .from("announcement_notification_preferences")
      .insert({
        club_id: clubId,
        push_enabled: pushEnabled,
        source_type: sourceType,
        user_id: userId,
      });

    if (error !== null) {
      throw new Error(`Failed to create announcement notification preference for ${userId}: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase
    .from("announcement_notification_preferences")
    .update({
      push_enabled: pushEnabled,
    })
    .eq("id", existingPreference.id);

  if (error !== null) {
    throw new Error(`Failed to update announcement notification preference ${existingPreference.id}: ${error.message}`);
  }
};

export const useActiveAnnouncementsQuery = ({
  isEnabled,
  userId,
}: UseActiveAnnouncementsQueryParams): UseQueryResult<ActiveAnnouncement[], Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchActiveAnnouncementsAsync(userId),
    queryKey: activeAnnouncementsQueryKey(userId),
    refetchInterval: isEnabled ? announcementFreshnessIntervalMs : false,
  });

export const useAnnouncementFeedQuery = ({
  isEnabled,
  userId,
}: UseActiveAnnouncementsQueryParams): UseQueryResult<AnnouncementFeedItem[], Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchAnnouncementFeedAsync(userId),
    queryKey: announcementFeedQueryKey(userId),
    refetchInterval: isEnabled ? announcementFreshnessIntervalMs : false,
  });

export const useAnnouncementDetailQuery = ({
  announcementId,
  isEnabled,
  userId,
}: UseAnnouncementDetailQueryParams): UseQueryResult<AnnouncementFeedItem | null, Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchAnnouncementDetailAsync(userId, announcementId),
    queryKey: announcementDetailQueryKey(userId, announcementId),
  });

export const useAnnouncementRealtimeInvalidation = ({
  isEnabled,
  userId,
}: AnnouncementRealtimeInvalidationParams): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isEnabled || userId.length === 0) {
      return;
    }

    const invalidateAnnouncementQueries = (): void => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: activeAnnouncementsQueryKey(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementFeedQueryKey(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["announcement-detail", userId],
        }),
      ]);
    };

    const interval = setInterval(invalidateAnnouncementQueries, announcementFreshnessIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [isEnabled, queryClient, userId]);
};

export const useRecordAnnouncementImpressionsMutation = (): UseMutationResult<
  void,
  Error,
  {
    announcementIds: string[];
    userId: string;
  }
> =>
  useMutation({
    mutationFn: recordAnnouncementImpressionsAsync,
  });

export const useSetAnnouncementNotificationPreferenceMutation = (): UseMutationResult<
  void,
  Error,
  {
    clubId: string | null;
    pushEnabled: boolean;
    sourceType: AnnouncementSourceType;
    userId: string;
  }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setAnnouncementNotificationPreferenceAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: announcementFeedQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["announcement-detail", variables.userId],
      });
    },
  });
};

export const useAcknowledgeAnnouncementMutation = (): UseMutationResult<
  void,
  Error,
  {
    announcementId: string;
    userId: string;
  }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAnnouncementAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: activeAnnouncementsQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: announcementFeedQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: announcementDetailQueryKey(variables.userId, variables.announcementId),
      });
    },
  });
};
