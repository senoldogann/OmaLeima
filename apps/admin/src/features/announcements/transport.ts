import {
  FunctionsHttpError,
  FunctionsRelayError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import type {
  AnnouncementAudience,
  AnnouncementMutationResponse,
  AnnouncementStatus,
} from "@/features/announcements/types";
import {
  removePublicStorageObjectByUrlAsync,
  removeReplacedPublicStorageObjectAsync,
} from "@/features/media/storage-cleanup";
import { mediaStagingBucketName, publishStagedMediaAsync } from "@/features/media/staged-media";

type AnnouncementTransportResult = {
  response: AnnouncementMutationResponse;
  status: number;
};

type AnnouncementInsertRow = {
  id: string;
};

type AnnouncementDeleteRow = {
  club_id: string | null;
  id: string;
  image_staging_path: string | null;
  image_url: string | null;
};

type AnnouncementMediaLookupRow = {
  id: string;
  image_staging_path: string | null;
  image_url: string | null;
};

const announcementMediaBucketId = "announcement-media";

const readStorageExtension = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  if (extension === "jpeg" || extension === "jpg" || extension === "png" || extension === "webp") {
    return extension;
  }

  throw new Error(`Unsupported announcement staging path extension: ${path}`);
};

const createPublishedAnnouncementImagePath = ({
  announcementId,
  clubId,
  stagingPath,
}: {
  announcementId: string;
  clubId: string | null;
  stagingPath: string;
}): string => {
  const fileName = `announcement-${announcementId}-${Date.now()}.${readStorageExtension(stagingPath)}`;

  return clubId === null ? `platform/${fileName}` : `clubs/${clubId}/${fileName}`;
};

const resolveExistingAnnouncementImageUrl = ({
  existingImageUrl,
  submittedImageUrl,
}: {
  existingImageUrl: string | null;
  submittedImageUrl: string | null;
}): string | null => {
  if (submittedImageUrl === null || submittedImageUrl.trim().length === 0) {
    return null;
  }

  return existingImageUrl;
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

export const deleteAnnouncementAsync = async (
  supabase: SupabaseClient,
  payload: {
    announcementId: string;
    clubId: string | null;
  }
): Promise<AnnouncementTransportResult> => {
  const selectQuery = supabase
    .from("announcements")
    .select("id,club_id,image_url,image_staging_path")
    .eq("id", payload.announcementId);
  const scopedSelectQuery = payload.clubId === null ? selectQuery.is("club_id", null) : selectQuery.eq("club_id", payload.clubId);
  const { data: announcement, error: selectError } =
    await scopedSelectQuery.maybeSingle<AnnouncementDeleteRow>();

  if (selectError !== null) {
    return {
      response: {
        message: selectError.message,
        status: "DELETE_LOOKUP_ERROR",
      },
      status: 502,
    };
  }

  if (announcement === null) {
    return {
      response: {
        message: `Announcement ${payload.announcementId} was not found for deletion.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  try {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `announcement ${announcement.id}`,
      publicUrl: announcement.image_url,
      supabase,
    });
    if (announcement.image_staging_path !== null) {
      const { error: stagingRemoveError } = await supabase.storage
        .from(mediaStagingBucketName)
        .remove([announcement.image_staging_path]);

      if (stagingRemoveError !== null) {
        throw new Error(`Failed to delete staged announcement image ${announcement.image_staging_path}: ${stagingRemoveError.message}`);
      }
    }
  } catch (error) {
    return {
      response: {
        message: error instanceof Error ? error.message : "Failed to delete announcement image.",
        status: "IMAGE_DELETE_ERROR",
      },
      status: 502,
    };
  }

  const deleteQuery = supabase
    .from("announcements")
    .delete()
    .eq("id", announcement.id);
  const scopedDeleteQuery = payload.clubId === null ? deleteQuery.is("club_id", null) : deleteQuery.eq("club_id", payload.clubId);
  const { data, error } = await scopedDeleteQuery.select("id").maybeSingle<AnnouncementInsertRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "DELETE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: `Announcement ${announcement.id} was not deleted.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  return {
    response: {
      message:
        announcement.image_url === null
          ? `Announcement ${data.id} deleted successfully.`
          : `Announcement ${data.id} and its owned image cleanup completed.`,
      status: "SUCCESS",
    },
    status: 200,
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
    eventId: string | null;
    imageStagingPath: string | null;
    imageUrl: string | null;
    priority: number;
    startsAt: string;
    status: AnnouncementStatus;
    title: string;
  }
): Promise<AnnouncementTransportResult> => {
  const normalizedStagingPath =
    payload.imageStagingPath === null || payload.imageStagingPath.trim().length === 0
      ? null
      : payload.imageStagingPath.trim();
  const announcementId = randomUUID();
  const publishedImageUrl =
    payload.status === "DRAFT"
      ? null
      : await publishStagedMediaAsync({
        context: `announcement ${announcementId}`,
        destinationBucketId: announcementMediaBucketId,
        destinationPath:
          normalizedStagingPath === null
            ? ""
            : createPublishedAnnouncementImagePath({
              announcementId,
              clubId: payload.clubId,
              stagingPath: normalizedStagingPath,
            }),
        stagingPath: normalizedStagingPath,
        supabase,
      });
  const nextImageUrl =
    payload.status === "DRAFT"
      ? null
      : publishedImageUrl;
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      id: announcementId,
      audience: payload.audience,
      body: payload.body,
      club_id: payload.clubId,
      created_by: payload.createdBy,
      cta_label: payload.ctaLabel,
      cta_url: payload.ctaUrl,
      ends_at: payload.endsAt,
      event_id: payload.eventId,
      image_staging_path: payload.status === "DRAFT" ? normalizedStagingPath : null,
      image_url: nextImageUrl,
      priority: payload.priority,
      starts_at: payload.startsAt,
      status: payload.status,
      title: payload.title,
    })
    .select("id")
    .single<AnnouncementInsertRow>();

  if (error !== null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `failed announcement ${announcementId} image publish rollback`,
      publicUrl: publishedImageUrl,
      supabase,
    });

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
    eventId: string | null;
    imageStagingPath: string | null;
    imageUrl: string | null;
    priority: number;
    startsAt: string;
    status: AnnouncementStatus;
    title: string;
  }
): Promise<AnnouncementTransportResult> => {
  const selectQuery = supabase
    .from("announcements")
    .select("id,image_url,image_staging_path")
    .eq("id", payload.announcementId);
  const scopedSelectQuery = payload.clubId === null ? selectQuery.is("club_id", null) : selectQuery.eq("club_id", payload.clubId);
  const { data: existingAnnouncement, error: existingError } =
    await scopedSelectQuery.maybeSingle<AnnouncementMediaLookupRow>();

  if (existingError !== null) {
    return {
      response: {
        message: existingError.message,
        status: "UPDATE_LOOKUP_ERROR",
      },
      status: 502,
    };
  }

  if (existingAnnouncement === null) {
    return {
      response: {
        message: `Announcement ${payload.announcementId} was not updated.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  const normalizedStagingPath =
    payload.imageStagingPath === null || payload.imageStagingPath.trim().length === 0
      ? null
      : payload.imageStagingPath.trim();
  const publishedImageUrl =
    payload.status === "DRAFT"
      ? null
      : await publishStagedMediaAsync({
        context: `announcement ${payload.announcementId}`,
        destinationBucketId: announcementMediaBucketId,
        destinationPath:
          normalizedStagingPath === null
            ? ""
            : createPublishedAnnouncementImagePath({
              announcementId: payload.announcementId,
              clubId: payload.clubId,
              stagingPath: normalizedStagingPath,
            }),
        stagingPath: normalizedStagingPath,
        supabase,
      });
  const nextImageUrl =
    payload.status === "DRAFT"
      ? null
      : publishedImageUrl ?? resolveExistingAnnouncementImageUrl({
        existingImageUrl: existingAnnouncement.image_url,
        submittedImageUrl: payload.imageUrl,
      });
  const nextImageStagingPath = payload.status === "DRAFT" ? normalizedStagingPath : null;

  const updateQuery = supabase
    .from("announcements")
    .update({
      audience: payload.audience,
      body: payload.body,
      cta_label: payload.ctaLabel,
      cta_url: payload.ctaUrl,
      ends_at: payload.endsAt,
      event_id: payload.eventId,
      image_staging_path: nextImageStagingPath,
      image_url: nextImageUrl,
      priority: payload.priority,
      starts_at: payload.startsAt,
      status: payload.status,
      title: payload.title,
    })
    .eq("id", payload.announcementId);

  const scopedQuery = payload.clubId === null ? updateQuery.is("club_id", null) : updateQuery.eq("club_id", payload.clubId);
  const { data, error } = await scopedQuery.select("id").maybeSingle<AnnouncementInsertRow>();

  if (error !== null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `failed announcement ${payload.announcementId} image publish rollback`,
      publicUrl: publishedImageUrl,
      supabase,
    });

    return {
      response: {
        message: error.message,
        status: "UPDATE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: announcementMediaBucketId,
      context: `not-updated announcement ${payload.announcementId} image publish rollback`,
      publicUrl: publishedImageUrl,
      supabase,
    });

    return {
      response: {
        message: `Announcement ${payload.announcementId} was not updated.`,
        status: "ANNOUNCEMENT_NOT_FOUND",
      },
      status: 404,
    };
  }

  try {
    await removeReplacedPublicStorageObjectAsync({
      bucketId: announcementMediaBucketId,
      context: `announcement ${payload.announcementId}`,
      newPublicUrl: nextImageUrl,
      oldPublicUrl: existingAnnouncement.image_url,
      supabase,
    });
    if (
      existingAnnouncement.image_staging_path !== null &&
      existingAnnouncement.image_staging_path !== nextImageStagingPath
    ) {
      const { error: stagingRemoveError } = await supabase.storage
        .from(mediaStagingBucketName)
        .remove([existingAnnouncement.image_staging_path]);

      if (stagingRemoveError !== null) {
        throw new Error(
          `Failed to delete staged announcement image ${existingAnnouncement.image_staging_path}: ${stagingRemoveError.message}`
        );
      }
    }
  } catch (error) {
    return {
      response: {
        message: error instanceof Error ? error.message : "Announcement image replacement cleanup failed.",
        status: "IMAGE_REPLACEMENT_DELETE_ERROR",
      },
      status: 502,
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
