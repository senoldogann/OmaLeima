import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import type { ClubMembershipSummary } from "@/features/club/types";
import { clubDashboardQueryKey } from "@/features/club/club-dashboard";
import { announcementFeedQueryKey, activeAnnouncementsQueryKey } from "@/features/announcements/announcements";
import {
  removePublicStorageObjectByUrlAsync,
  removeReplacedPublicStorageObjectAsync,
} from "@/features/media/storage-cleanup";
import { createSignedStagedMediaUrlAsync, mediaStagingBucketName, publishStagedMediaAsync } from "@/features/media/staged-media";
import { supabase } from "@/lib/supabase";

export type ClubAnnouncementAudience = "ALL" | "CLUBS" | "STUDENTS";
export type ClubAnnouncementStatus = "ARCHIVED" | "DRAFT" | "PUBLISHED";

export type ClubAnnouncementRecord = {
  announcementId: string;
  audience: ClubAnnouncementAudience;
  body: string;
  clubId: string;
  clubName: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  endsAt: string | null;
  imageStagingPath: string | null;
  imageUrl: string | null;
  priority: number;
  showAsPopup: boolean;
  startsAt: string;
  status: ClubAnnouncementStatus;
  title: string;
  updatedAt: string;
};

export type ClubAnnouncementDraft = {
  announcementId: string | null;
  audience: ClubAnnouncementAudience;
  body: string;
  clubId: string;
  ctaLabel: string;
  ctaUrl: string;
  endsAt: string;
  imageStagingPath: string;
  imageUrl: string;
  priority: string;
  showAsPopup: boolean;
  startsAt: string;
  status: Exclude<ClubAnnouncementStatus, "ARCHIVED">;
  title: string;
};

type ClubAnnouncementRow = {
  audience: ClubAnnouncementAudience;
  body: string;
  club_id: string;
  club: {
    name: string;
  } | null;
  cta_label: string | null;
  cta_url: string | null;
  ends_at: string | null;
  id: string;
  image_url: string | null;
  image_staging_path: string | null;
  priority: number;
  show_as_popup: boolean;
  starts_at: string;
  status: ClubAnnouncementStatus;
  title: string;
  updated_at: string;
};

type UseClubAnnouncementsQueryParams = {
  clubIds: string[];
  isEnabled: boolean;
};

type ClubAnnouncementMutationVariables = {
  draft: ClubAnnouncementDraft;
  userId: string;
};

type ClubAnnouncementArchiveVariables = {
  announcementId: string;
  clubId: string;
  userId: string;
};

type ClubAnnouncementDeleteVariables = {
  announcementId: string;
  clubId: string;
  userId: string;
};

type ClubAnnouncementMutationResult = {
  announcementId: string | null;
  message: string;
  status: "SUCCESS" | "NOOP";
};

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const announcementMediaBucketId = "announcement-media";

const clubAnnouncementsQueryRoot = ["club-announcements"] as const;

export const clubAnnouncementsQueryKey = (clubIds: string[]) => ["club-announcements", [...clubIds].sort()] as const;

const toLocalDateTimeInput = (value: Date): string => {
  const timezoneOffsetMs = value.getTimezoneOffset() * 60_000;
  const localDate = new Date(value.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

export const createEmptyClubAnnouncementDraft = (membership: ClubMembershipSummary | null): ClubAnnouncementDraft => ({
  announcementId: null,
  audience: "STUDENTS",
  body: "",
  clubId: membership?.clubId ?? "",
  ctaLabel: "",
  ctaUrl: "",
  endsAt: "",
  imageUrl: "",
  imageStagingPath: "",
  priority: "0",
  showAsPopup: true,
  startsAt: toLocalDateTimeInput(new Date()),
  status: "PUBLISHED",
  title: "",
});

export const createClubAnnouncementDraftFromRecord = (record: ClubAnnouncementRecord): ClubAnnouncementDraft => ({
  announcementId: record.announcementId,
  audience: record.audience,
  body: record.body,
  clubId: record.clubId,
  ctaLabel: record.ctaLabel ?? "",
  ctaUrl: record.ctaUrl ?? "",
  endsAt: record.endsAt === null ? "" : toLocalDateTimeInput(new Date(record.endsAt)),
  imageUrl: record.imageUrl ?? "",
  imageStagingPath: record.imageStagingPath ?? "",
  priority: String(record.priority),
  showAsPopup: record.showAsPopup,
  startsAt: toLocalDateTimeInput(new Date(record.startsAt)),
  status: record.status === "ARCHIVED" ? "DRAFT" : record.status,
  title: record.title,
});

const parseLocalDateTimeOrThrow = (value: string, fieldName: string): string => {
  const normalizedValue = value.trim();

  if (!localDateTimePattern.test(normalizedValue)) {
    throw new Error(`${fieldName} must use YYYY-MM-DDTHH:mm format.`);
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid local datetime.`);
  }

  return parsedDate.toISOString();
};

const parseOptionalLocalDateTimeOrThrow = (value: string, fieldName: string): string | null => {
  if (value.trim().length === 0) {
    return null;
  }

  return parseLocalDateTimeOrThrow(value, fieldName);
};

const parsePriorityOrThrow = (value: string): number => {
  const normalizedValue = value.trim();
  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || String(parsedValue) !== normalizedValue || parsedValue < 0 || parsedValue > 10) {
    throw new Error("priority must be a whole number between 0 and 10.");
  }

  return parsedValue;
};

const parseOptionalText = (value: string): string | null => {
  const normalizedValue = value.trim();

  return normalizedValue.length === 0 ? null : normalizedValue;
};

const readStorageExtension = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  if (extension === "jpeg" || extension === "jpg" || extension === "png" || extension === "webp") {
    return extension;
  }

  throw new Error(`Unsupported announcement staging path extension: ${path}`);
};

const createPublishedAnnouncementImagePath = (clubId: string, stagingPath: string): string =>
  `clubs/${clubId}/announcement-${Date.now()}.${readStorageExtension(stagingPath)}`;

const assertDraftFields = (draft: ClubAnnouncementDraft): void => {
  if (draft.clubId.trim().length === 0) {
    throw new Error("clubId is required before saving an announcement.");
  }

  if (draft.title.trim().length < 3 || draft.title.trim().length > 120) {
    throw new Error("title must be between 3 and 120 characters.");
  }

  if (draft.body.trim().length < 12 || draft.body.trim().length > 1200) {
    throw new Error("body must be between 12 and 1200 characters.");
  }

  if (draft.ctaLabel.trim().length > 0 && draft.ctaLabel.trim().length < 2) {
    throw new Error("ctaLabel must be at least 2 characters when provided.");
  }

  if (draft.ctaUrl.trim().length > 0 && !/^https?:\/\/.+/i.test(draft.ctaUrl.trim())) {
    throw new Error("ctaUrl must be a full http or https URL when provided.");
  }
};

const mapClubAnnouncementRow = (
  row: ClubAnnouncementRow,
  signedUrlByStagingPath: Map<string, string>
): ClubAnnouncementRecord => ({
  announcementId: row.id,
  audience: row.audience,
  body: row.body,
  clubId: row.club_id,
  clubName: row.club?.name ?? "Club",
  ctaLabel: row.cta_label,
  ctaUrl: row.cta_url,
  endsAt: row.ends_at,
  imageStagingPath: row.image_staging_path,
  imageUrl:
    row.image_url ??
    (row.image_staging_path === null ? null : signedUrlByStagingPath.get(row.image_staging_path) ?? null),
  priority: row.priority,
  showAsPopup: row.show_as_popup,
  startsAt: row.starts_at,
  status: row.status,
  title: row.title,
  updatedAt: row.updated_at,
});

const createSignedUrlByStagingPathAsync = async (
  rows: ClubAnnouncementRow[]
): Promise<Map<string, string>> => {
  const stagingPaths = Array.from(
    new Set(
      rows
        .map((row) => row.image_staging_path)
        .filter((value): value is string => value !== null && value.trim().length > 0)
    )
  );
  const entries = await Promise.all(
    stagingPaths.map(async (stagingPath): Promise<[string, string]> => [
      stagingPath,
      await createSignedStagedMediaUrlAsync(stagingPath),
    ])
  );

  return new Map(entries);
};

const fetchClubAnnouncementsAsync = async (clubIds: string[]): Promise<ClubAnnouncementRecord[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      club_id,
      title,
      body,
      audience,
      status,
      priority,
      starts_at,
      ends_at,
      show_as_popup,
      cta_label,
      cta_url,
      image_url,
      image_staging_path,
      updated_at,
      club:clubs(name)
    `
    )
    .in("club_id", clubIds)
    .order("updated_at", { ascending: false })
    .limit(30)
    .returns<ClubAnnouncementRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club announcements for ${clubIds.join(",")}: ${error.message}`);
  }

  const signedUrlByStagingPath = await createSignedUrlByStagingPathAsync(data);

  return data.map((row) => mapClubAnnouncementRow(row, signedUrlByStagingPath));
};

const buildAnnouncementPayload = async (draft: ClubAnnouncementDraft, userId: string) => {
  assertDraftFields(draft);
  const startsAt = parseLocalDateTimeOrThrow(draft.startsAt, "startsAt");
  const endsAt = parseOptionalLocalDateTimeOrThrow(draft.endsAt, "endsAt");

  if (endsAt !== null && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("endsAt must be after startsAt.");
  }

  const parsedImageStagingPath = parseOptionalText(draft.imageStagingPath);
  const publishedImageUrl =
    draft.status === "DRAFT"
      ? null
      : await publishStagedMediaAsync({
        context: `announcement for club ${draft.clubId}`,
        destinationBucketId: announcementMediaBucketId,
        destinationPath:
          parsedImageStagingPath === null
            ? ""
            : createPublishedAnnouncementImagePath(draft.clubId, parsedImageStagingPath),
        stagingPath: parsedImageStagingPath,
      });
  const parsedImageUrl = draft.status === "DRAFT" ? null : publishedImageUrl ?? parseOptionalText(draft.imageUrl);

  return {
    publishedImageUrl,
    row: {
      audience: draft.audience,
      body: draft.body.trim(),
      club_id: draft.clubId,
      created_by: userId,
      cta_label: parseOptionalText(draft.ctaLabel),
      cta_url: parseOptionalText(draft.ctaUrl),
      ends_at: endsAt,
      image_staging_path: draft.status === "DRAFT" ? parsedImageStagingPath : null,
      image_url: parsedImageUrl,
      priority: parsePriorityOrThrow(draft.priority),
      show_as_popup: draft.showAsPopup,
      starts_at: startsAt,
      status: draft.status,
      title: draft.title.trim(),
    },
  };
};

const saveClubAnnouncementAsync = async ({
  draft,
  userId,
}: ClubAnnouncementMutationVariables): Promise<ClubAnnouncementMutationResult> => {
  const payload = await buildAnnouncementPayload(draft, userId);

  if (draft.announcementId === null) {
    const { data, error } = await supabase
      .from("announcements")
      .insert(payload.row)
      .select("id")
      .single<{ id: string }>();

    if (error !== null) {
      await removePublicStorageObjectByUrlAsync({
        bucketId: announcementMediaBucketId,
        context: `failed club ${draft.clubId} announcement image publish rollback`,
        publicUrl: payload.publishedImageUrl,
      });

      throw new Error(`Failed to create club announcement for ${draft.clubId}: ${error.message}`);
    }

    return {
      announcementId: data.id,
      message: "Announcement created successfully.",
      status: "SUCCESS",
    };
  }

  const { data: existingAnnouncement, error: existingError } = await supabase
    .from("announcements")
    .select("id,image_url,image_staging_path")
    .eq("id", draft.announcementId)
    .eq("club_id", draft.clubId)
    .maybeSingle<{ id: string; image_staging_path: string | null; image_url: string | null }>();

  if (existingError !== null) {
    throw new Error(`Failed to load current image for club announcement ${draft.announcementId}: ${existingError.message}`);
  }

  if (existingAnnouncement === null) {
    return {
      announcementId: null,
      message: "Announcement was not updated. It may be outside this organizer account.",
      status: "NOOP",
    };
  }

  const { data, error } = await supabase
    .from("announcements")
    .update({
      audience: payload.row.audience,
      body: payload.row.body,
      cta_label: payload.row.cta_label,
      cta_url: payload.row.cta_url,
      ends_at: payload.row.ends_at,
      image_staging_path: payload.row.image_staging_path,
      image_url: payload.row.image_url,
      priority: payload.row.priority,
      show_as_popup: payload.row.show_as_popup,
      starts_at: payload.row.starts_at,
      status: payload.row.status,
      title: payload.row.title,
    })
    .eq("id", draft.announcementId)
    .eq("club_id", draft.clubId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `failed announcement ${draft.announcementId} image publish rollback`,
      publicUrl: payload.publishedImageUrl,
    });

    throw new Error(`Failed to update club announcement ${draft.announcementId}: ${error.message}`);
  }

  if (data === null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `not-updated announcement ${draft.announcementId} image publish rollback`,
      publicUrl: payload.publishedImageUrl,
    });

    return {
      announcementId: null,
      message: "Announcement was not updated. It may be outside this organizer account.",
      status: "NOOP",
    };
  }

  await removeReplacedPublicStorageObjectAsync({
    bucketId: announcementMediaBucketId,
    context: `announcement ${draft.announcementId}`,
    newPublicUrl: payload.row.image_url,
    oldPublicUrl: existingAnnouncement.image_url,
  });

  if (
    draft.status !== "DRAFT" &&
    existingAnnouncement.image_staging_path !== null
  ) {
    const { error: removeStagingError } = await supabase.storage
      .from(mediaStagingBucketName)
      .remove([existingAnnouncement.image_staging_path]);

    if (removeStagingError !== null) {
      throw new Error(`Failed to remove old staged announcement image ${existingAnnouncement.image_staging_path}: ${removeStagingError.message}`);
    }
  }

  return {
    announcementId: data.id,
    message: "Announcement updated successfully.",
    status: "SUCCESS",
  };
};

const deleteClubAnnouncementAsync = async ({
  announcementId,
  clubId,
}: ClubAnnouncementDeleteVariables): Promise<ClubAnnouncementMutationResult> => {
  const { data: announcement, error: selectError } = await supabase
    .from("announcements")
    .select("id,image_url,image_staging_path")
    .eq("id", announcementId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: string; image_staging_path: string | null; image_url: string | null }>();

  if (selectError !== null) {
    throw new Error(`Failed to load club announcement ${announcementId} before deletion: ${selectError.message}`);
  }

  if (announcement === null) {
    return {
      announcementId: null,
      message: "Announcement was not deleted. It may be outside this organizer account.",
      status: "NOOP",
    };
  }

  await removePublicStorageObjectByUrlAsync({
    bucketId: announcementMediaBucketId,
    context: `announcement ${announcementId}`,
    publicUrl: announcement.image_url,
  });
  if (announcement.image_staging_path !== null) {
    const { error: removeStagingError } = await supabase.storage
      .from(mediaStagingBucketName)
      .remove([announcement.image_staging_path]);

    if (removeStagingError !== null) {
      throw new Error(`Failed to remove staged announcement image ${announcement.image_staging_path}: ${removeStagingError.message}`);
    }
  }

  const { data, error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("club_id", clubId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) {
    throw new Error(`Failed to delete club announcement ${announcementId}: ${error.message}`);
  }

  if (data === null) {
    return {
      announcementId: null,
      message: "Announcement was not deleted. It may be outside this organizer account.",
      status: "NOOP",
    };
  }

  return {
    announcementId: data.id,
    message: "Announcement deleted successfully.",
    status: "SUCCESS",
  };
};

const archiveClubAnnouncementAsync = async ({
  announcementId,
  clubId,
}: ClubAnnouncementArchiveVariables): Promise<ClubAnnouncementMutationResult> => {
  const { data, error } = await supabase
    .from("announcements")
    .update({
      status: "ARCHIVED",
    })
    .eq("id", announcementId)
    .eq("club_id", clubId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) {
    throw new Error(`Failed to archive club announcement ${announcementId}: ${error.message}`);
  }

  if (data === null) {
    return {
      announcementId: null,
      message: "Announcement was not archived. It may be outside this organizer account.",
      status: "NOOP",
    };
  }

  return {
    announcementId: data.id,
    message: "Announcement archived successfully.",
    status: "SUCCESS",
  };
};

export const useClubAnnouncementsQuery = ({
  clubIds,
  isEnabled,
}: UseClubAnnouncementsQueryParams): UseQueryResult<ClubAnnouncementRecord[], Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchClubAnnouncementsAsync(clubIds),
    queryKey: clubAnnouncementsQueryKey(clubIds),
  });

export const useSaveClubAnnouncementMutation = (): UseMutationResult<
  ClubAnnouncementMutationResult,
  Error,
  ClubAnnouncementMutationVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveClubAnnouncementAsync,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: clubAnnouncementsQueryRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: clubDashboardQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementFeedQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: activeAnnouncementsQueryKey(variables.userId),
        }),
      ]);
    },
  });
};

export const useArchiveClubAnnouncementMutation = (): UseMutationResult<
  ClubAnnouncementMutationResult,
  Error,
  ClubAnnouncementArchiveVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveClubAnnouncementAsync,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: clubAnnouncementsQueryRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: clubDashboardQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementFeedQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: activeAnnouncementsQueryKey(variables.userId),
        }),
      ]);
    },
  });
};

export const useDeleteClubAnnouncementMutation = (): UseMutationResult<
  ClubAnnouncementMutationResult,
  Error,
  ClubAnnouncementDeleteVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClubAnnouncementAsync,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: clubAnnouncementsQueryRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: clubDashboardQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementFeedQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: activeAnnouncementsQueryKey(variables.userId),
        }),
      ]);
    },
  });
};
