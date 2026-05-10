"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  submitLoginSlideDeleteRequestAsync,
  submitLoginSlideUpsertRequestAsync,
} from "@/features/login-slides/client";
import { uploadLoginSlideImageAsync } from "@/features/login-slides/media-upload";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import {
  getLoginSlideLocalizedCopy,
  type LoginSlideLocalizedCopy,
  LoginSlideMutationResponse,
  LoginSlidePayload,
  LoginSlideRecord,
} from "@/features/login-slides/types";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";
import { createClient } from "@/lib/supabase/client";

type LoginSlidesPanelProps = {
  locale: DashboardLocale;
  slides: LoginSlideRecord[];
};

type ActionState = {
  message: string;
  tone: "error" | "success";
};

type LoginSlidesCopy = {
  active: string;
  addNew: string;
  alt: string;
  body: string;
  delete: string;
  deleteConfirm: string;
  edit: string;
  englishCopy: string;
  eyebrow: string;
  finnishCopy: string;
  image: string;
  imageUploaded: string;
  imageUrl: string;
  inactive: string;
  order: string;
  reset: string;
  save: string;
  saving: string;
  slides: string;
  title: string;
  upload: string;
  uploading: string;
};

const copyByLocale: Record<DashboardLocale, LoginSlidesCopy> = {
  en: {
    active: "Active",
    addNew: "New slide",
    alt: "Image alt text",
    body: "Body",
    delete: "Delete",
    deleteConfirm: "Delete this login slide permanently? Its owned uploaded image will be removed too.",
    edit: "Edit",
    englishCopy: "English copy",
    eyebrow: "Eyebrow",
    finnishCopy: "Finnish copy",
    image: "Image",
    imageUploaded: "Login slide image uploaded.",
    imageUrl: "Image URL",
    inactive: "Inactive",
    order: "Order",
    reset: "Reset",
    save: "Save slide",
    saving: "Saving...",
    slides: "Login slides",
    title: "Title",
    upload: "Upload image",
    uploading: "Uploading...",
  },
  fi: {
    active: "Aktiivinen",
    addNew: "Uusi slide",
    alt: "Kuvan alt-teksti",
    body: "Teksti",
    delete: "Poista",
    deleteConfirm: "Poistetaanko login-slide pysyvästi? OmaLeimaan ladattu kuva poistetaan myös.",
    edit: "Muokkaa",
    englishCopy: "Englanninkieliset tekstit",
    eyebrow: "Ylätunniste",
    finnishCopy: "Suomenkieliset tekstit",
    image: "Kuva",
    imageUploaded: "Login-sliden kuva ladattiin.",
    imageUrl: "Kuvan URL",
    inactive: "Passiivinen",
    order: "Järjestys",
    reset: "Tyhjennä",
    save: "Tallenna slide",
    saving: "Tallennetaan...",
    slides: "Login-slidet",
    title: "Otsikko",
    upload: "Lataa kuva",
    uploading: "Ladataan...",
  },
};

const createEmptyPayload = (): LoginSlidePayload => ({
  id: null,
  imageUrl: "",
  isActive: true,
  localized: {
    en: {
      body: "",
      eyebrow: "OmaLeima",
      imageAlt: "",
      title: "",
    },
    fi: {
      body: "",
      eyebrow: "OmaLeima",
      imageAlt: "",
      title: "",
    },
  },
  sortOrder: "0",
});

const createPayloadFromRecord = (slide: LoginSlideRecord): LoginSlidePayload => ({
  id: slide.id,
  imageUrl: slide.imageUrl,
  isActive: slide.isActive,
  localized: slide.localized,
  sortOrder: String(slide.sortOrder),
});

const isSuccessResponse = (response: LoginSlideMutationResponse): boolean => response.status === "SUCCESS";

export const LoginSlidesPanel = ({ locale, slides }: LoginSlidesPanelProps) => {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [payload, setPayload] = useState<LoginSlidePayload>(() => createEmptyPayload());
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingSlideId, setDeletingSlideId] = useState<string | null>(null);

  useTransientSuccessKey(
    actionState?.tone === "success" ? actionState.message : null,
    () => setActionState(null),
    successNoticeDurationMs
  );

  const updateImageUrlPayload = (value: string): void => {
    setPayload((currentPayload) => ({
      ...currentPayload,
      imageUrl: value,
    }));
  };

  const updateSortOrderPayload = (value: string): void => {
    setPayload((currentPayload) => ({
      ...currentPayload,
      sortOrder: value,
    }));
  };

  const updateIsActivePayload = (value: boolean): void => {
    setPayload((currentPayload) => ({
      ...currentPayload,
      isActive: value,
    }));
  };

  const updateLocalizedPayload = (
    slideLocale: DashboardLocale,
    field: keyof LoginSlideLocalizedCopy,
    value: string
  ): void => {
    setPayload((currentPayload) => ({
      ...currentPayload,
      localized: {
        ...currentPayload.localized,
        [slideLocale]: {
          ...currentPayload.localized[slideLocale],
          [field]: value,
        },
      },
    }));
  };

  const resetPayload = (): void => {
    setPayload(createEmptyPayload());
    setActionState(null);
  };

  const handleUploadImageAsync = async (file: File): Promise<void> => {
    setIsUploading(true);
    setActionState(null);

    try {
      const uploadedImage = await uploadLoginSlideImageAsync({
        file,
        supabase,
      });
      updateImageUrlPayload(uploadedImage.publicUrl);
      setActionState({
        message: copy.imageUploaded,
        tone: "success",
      });
    } catch (error) {
      setActionState({
        message: error instanceof Error ? error.message : "Unknown login slide image upload error.",
        tone: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAsync = async (): Promise<void> => {
    setIsSaving(true);
    setActionState(null);

    try {
      const response = await submitLoginSlideUpsertRequestAsync(payload);
      setActionState({
        message: response.message,
        tone: isSuccessResponse(response) ? "success" : "error",
      });

      if (isSuccessResponse(response)) {
        resetPayload();
        router.refresh();
      }
    } catch (error) {
      setActionState({
        message: error instanceof Error ? error.message : "Unknown login slide save error.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsync = async (slideId: string): Promise<void> => {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    setDeletingSlideId(slideId);
    setActionState(null);

    try {
      const response = await submitLoginSlideDeleteRequestAsync(slideId);
      setActionState({
        message: response.message,
        tone: isSuccessResponse(response) ? "success" : "error",
      });

      if (isSuccessResponse(response)) {
        resetPayload();
        router.refresh();
      }
    } catch (error) {
      setActionState({
        message: error instanceof Error ? error.message : "Unknown login slide delete error.",
        tone: "error",
      });
    } finally {
      setDeletingSlideId(null);
    }
  };
  const previewCopy = payload.localized[locale];

  return (
    <div className="content-grid">
      <section className="panel panel-accent">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">{payload.id === null ? copy.addNew : copy.edit}</div>
            <h2 className="section-title">{copy.slides}</h2>
          </div>

          <div className="form-grid">
            <div className="field field-full">
              <span className="eyebrow">{copy.finnishCopy}</span>
            </div>
            <label className="field">
              <span className="field-label">{copy.eyebrow}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("fi", "eyebrow", event.target.value)}
                value={payload.localized.fi.eyebrow}
              />
            </label>
            <label className="field">
              <span className="field-label">{copy.title}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("fi", "title", event.target.value)}
                value={payload.localized.fi.title}
              />
            </label>
            <label className="field field-full">
              <span className="field-label">{copy.body}</span>
              <textarea
                className="field-input textarea"
                onChange={(event) => updateLocalizedPayload("fi", "body", event.target.value)}
                value={payload.localized.fi.body}
              />
            </label>
            <label className="field field-full">
              <span className="field-label">{copy.alt}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("fi", "imageAlt", event.target.value)}
                value={payload.localized.fi.imageAlt}
              />
            </label>
            <div className="field field-full">
              <span className="eyebrow">{copy.englishCopy}</span>
            </div>
            <label className="field">
              <span className="field-label">{copy.eyebrow}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("en", "eyebrow", event.target.value)}
                value={payload.localized.en.eyebrow}
              />
            </label>
            <label className="field">
              <span className="field-label">{copy.title}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("en", "title", event.target.value)}
                value={payload.localized.en.title}
              />
            </label>
            <label className="field field-full">
              <span className="field-label">{copy.body}</span>
              <textarea
                className="field-input textarea"
                onChange={(event) => updateLocalizedPayload("en", "body", event.target.value)}
                value={payload.localized.en.body}
              />
            </label>
            <label className="field field-full">
              <span className="field-label">{copy.alt}</span>
              <input
                className="field-input"
                onChange={(event) => updateLocalizedPayload("en", "imageAlt", event.target.value)}
                value={payload.localized.en.imageAlt}
              />
            </label>
            <label className="field">
              <span className="field-label">{copy.order}</span>
              <input
                className="field-input"
                inputMode="numeric"
                onChange={(event) => updateSortOrderPayload(event.target.value)}
                value={payload.sortOrder}
              />
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="field-input"
                onChange={(event) => updateIsActivePayload(event.target.value === "active")}
                value={payload.isActive ? "active" : "inactive"}
              >
                <option value="active">{copy.active}</option>
                <option value="inactive">{copy.inactive}</option>
              </select>
            </label>
            <label className="field field-full">
              <span className="field-label">{copy.imageUrl}</span>
              <input
                className="field-input"
                onChange={(event) => updateImageUrlPayload(event.target.value)}
                value={payload.imageUrl}
              />
            </label>
          </div>

          <label className="upload-dropzone">
            {isUploading ? copy.uploading : copy.upload}
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";

                if (file !== null) {
                  void handleUploadImageAsync(file);
                }
              }}
              type="file"
            />
          </label>

          {payload.imageUrl.trim().length > 0 ? (
            <div
              aria-label={copy.image}
              className="login-slide-preview"
              style={{ backgroundImage: `url("${payload.imageUrl}")` }}
            >
              <div>
                <span>{previewCopy.eyebrow}</span>
                <strong>{previewCopy.title}</strong>
                <p>{previewCopy.body}</p>
              </div>
            </div>
          ) : null}

          <div className="button-row">
            <button className="button button-primary" disabled={isSaving || isUploading} onClick={() => void handleSaveAsync()} type="button">
              {isSaving ? copy.saving : copy.save}
            </button>
            <button className="button button-ghost" disabled={isSaving || isUploading} onClick={resetPayload} type="button">
              {copy.reset}
            </button>
          </div>

          {actionState !== null ? (
            <p className={actionState.tone === "success" ? "inline-success" : "inline-error"}>{actionState.message}</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="stack-sm">
          <div className="eyebrow">{copy.slides}</div>
          <h2 className="section-title">{copy.image}</h2>
        </div>

        <div className="record-list">
          {slides.map((slide) => {
            const slideCopy = getLoginSlideLocalizedCopy(slide, locale);

            return (
              <article className="record-item" key={slide.id}>
                <div className="record-main">
                  <div
                    aria-label={slideCopy.imageAlt.length > 0 ? slideCopy.imageAlt : slideCopy.title}
                    className="login-slide-thumb"
                    style={{ backgroundImage: `url("${slide.imageUrl}")` }}
                  />
                  <div>
                    <div className="record-title">{slideCopy.title}</div>
                    <div className="record-meta">{slideCopy.eyebrow} · #{slide.sortOrder}</div>
                    <p className="record-note">{slideCopy.body}</p>
                  </div>
                </div>
                <div className="moderation-actions">
                  <span className={slide.isActive ? "status-pill status-pill-success" : "status-pill"}>
                    {slide.isActive ? copy.active : copy.inactive}
                  </span>
                  <button className="button button-secondary" onClick={() => setPayload(createPayloadFromRecord(slide))} type="button">
                    {copy.edit}
                  </button>
                  <button
                    className="button button-danger"
                    disabled={deletingSlideId === slide.id}
                    onClick={() => void handleDeleteAsync(slide.id)}
                    type="button"
                  >
                    {deletingSlideId === slide.id ? "..." : copy.delete}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
