import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type ActiveAnnouncement = {
  announcementId: string;
  body: string;
  clubName: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  priority: number;
  startsAt: string;
  title: string;
};

type AnnouncementRow = {
  body: string;
  club: {
    name: string;
  } | null;
  cta_label: string | null;
  cta_url: string | null;
  id: string;
  priority: number;
  starts_at: string;
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  title: string;
};

type AnnouncementAcknowledgementRow = {
  announcement_id: string;
};

type UseActiveAnnouncementsQueryParams = {
  isEnabled: boolean;
  userId: string;
};

export const activeAnnouncementsQueryKey = (userId: string) => ["active-announcements", userId] as const;

const mapAnnouncements = (rows: AnnouncementRow[], acknowledgedIds: Set<string>): ActiveAnnouncement[] =>
  rows
    .filter((row) => row.status === "PUBLISHED" && !acknowledgedIds.has(row.id))
    .map((row) => ({
      announcementId: row.id,
      body: row.body,
      clubName: row.club?.name ?? null,
      ctaLabel: row.cta_label,
      ctaUrl: row.cta_url,
      priority: row.priority,
      startsAt: row.starts_at,
      title: row.title,
    }));

const fetchActiveAnnouncementsAsync = async (userId: string): Promise<ActiveAnnouncement[]> => {
  const nowIso = new Date().toISOString();
  const [{ data: announcementRows, error: announcementError }, { data: acknowledgementRows, error: acknowledgementError }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select(
          `
          id,
          title,
          body,
          cta_label,
          cta_url,
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

const acknowledgeAnnouncementAsync = async ({
  announcementId,
  userId,
}: {
  announcementId: string;
  userId: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("announcement_acknowledgements")
    .upsert(
      {
        announcement_id: announcementId,
        user_id: userId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "announcement_id,user_id",
      }
    );

  if (error !== null) {
    throw new Error(`Failed to acknowledge announcement ${announcementId} for ${userId}: ${error.message}`);
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
  });

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
    },
  });
};
