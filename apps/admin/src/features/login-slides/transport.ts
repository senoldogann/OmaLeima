import type { SupabaseClient } from "@supabase/supabase-js";

import type { LoginSlideMutationResponse, LoginSlidePayload } from "@/features/login-slides/types";
import {
  removePublicStorageObjectByUrlAsync,
  removeReplacedPublicStorageObjectAsync,
} from "@/features/media/storage-cleanup";

type LoginSlideTransportResult = {
  response: LoginSlideMutationResponse;
  status: number;
};

type LoginSlideRow = {
  id: string;
  image_url: string;
};

const loginSliderMediaBucketId = "login-slider-media";

const parseSortOrder = (value: string): number => Number.parseInt(value, 10);

export const upsertLoginSlideAsync = async (
  supabase: SupabaseClient,
  payload: LoginSlidePayload,
  userId: string
): Promise<LoginSlideTransportResult> => {
  const existingSlide =
    payload.id === null
      ? null
      : await supabase
        .from("login_slides")
        .select("id,image_url")
        .eq("id", payload.id)
        .maybeSingle<LoginSlideRow>();

  if (existingSlide !== null && existingSlide.error !== null) {
    return {
      response: {
        message: existingSlide.error.message,
        status: "LOOKUP_ERROR",
      },
      status: 502,
    };
  }

  if (payload.id !== null && existingSlide?.data === null) {
    return {
      response: {
        message: `Login slide ${payload.id} was not found.`,
        status: "SLIDE_NOT_FOUND",
      },
      status: 404,
    };
  }

  const rowPayload = {
    body: payload.localized.fi.body,
    body_en: payload.localized.en.body,
    body_fi: payload.localized.fi.body,
    eyebrow: payload.localized.fi.eyebrow,
    eyebrow_en: payload.localized.en.eyebrow,
    eyebrow_fi: payload.localized.fi.eyebrow,
    image_alt: payload.localized.fi.imageAlt,
    image_alt_en: payload.localized.en.imageAlt,
    image_alt_fi: payload.localized.fi.imageAlt,
    image_url: payload.imageUrl,
    is_active: payload.isActive,
    sort_order: parseSortOrder(payload.sortOrder),
    title: payload.localized.fi.title,
    title_en: payload.localized.en.title,
    title_fi: payload.localized.fi.title,
    updated_by: userId,
  };

  const mutation =
    payload.id === null
      ? supabase
        .from("login_slides")
        .insert({
          ...rowPayload,
          created_by: userId,
        })
        .select("id")
        .single<{ id: string }>()
      : supabase
        .from("login_slides")
        .update(rowPayload)
        .eq("id", payload.id)
        .select("id")
        .maybeSingle<{ id: string }>();
  const { data, error } = await mutation;

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: payload.id === null ? "CREATE_ERROR" : "UPDATE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: `Login slide ${payload.id ?? "new"} was not saved.`,
        status: "SLIDE_NOT_FOUND",
      },
      status: 404,
    };
  }

  if (existingSlide?.data !== null && typeof existingSlide?.data !== "undefined") {
    try {
      await removeReplacedPublicStorageObjectAsync({
        bucketId: loginSliderMediaBucketId,
        context: `login slide ${data.id}`,
        newPublicUrl: payload.imageUrl,
        oldPublicUrl: existingSlide.data.image_url,
        supabase,
      });
    } catch (error) {
      return {
        response: {
          message: error instanceof Error ? error.message : "Login slide image replacement cleanup failed.",
          status: "IMAGE_REPLACEMENT_DELETE_ERROR",
        },
        status: 502,
      };
    }
  }

  return {
    response: {
      message: payload.id === null ? `Login slide ${data.id} created.` : `Login slide ${data.id} updated.`,
      status: "SUCCESS",
    },
    status: 200,
  };
};

export const deleteLoginSlideAsync = async (
  supabase: SupabaseClient,
  slideId: string
): Promise<LoginSlideTransportResult> => {
  const { data: slide, error: selectError } = await supabase
    .from("login_slides")
    .select("id,image_url")
    .eq("id", slideId)
    .maybeSingle<LoginSlideRow>();

  if (selectError !== null) {
    return {
      response: {
        message: selectError.message,
        status: "LOOKUP_ERROR",
      },
      status: 502,
    };
  }

  if (slide === null) {
    return {
      response: {
        message: `Login slide ${slideId} was not found.`,
        status: "SLIDE_NOT_FOUND",
      },
      status: 404,
    };
  }

  try {
    await removePublicStorageObjectByUrlAsync({
      bucketId: loginSliderMediaBucketId,
      context: `login slide ${slide.id}`,
      publicUrl: slide.image_url,
      supabase,
    });
  } catch (error) {
    return {
      response: {
        message: error instanceof Error ? error.message : "Login slide image cleanup failed.",
        status: "IMAGE_DELETE_ERROR",
      },
      status: 502,
    };
  }

  const { data, error } = await supabase
    .from("login_slides")
    .delete()
    .eq("id", slide.id)
    .select("id")
    .maybeSingle<{ id: string }>();

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
        message: `Login slide ${slide.id} was not deleted.`,
        status: "SLIDE_NOT_FOUND",
      },
      status: 404,
    };
  }

  return {
    response: {
      message: `Login slide ${data.id} deleted.`,
      status: "SUCCESS",
    },
    status: 200,
  };
};
