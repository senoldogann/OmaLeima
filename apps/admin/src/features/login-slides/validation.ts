import { z } from "zod";

import { isUuid } from "@/features/business-applications/validation";
import type { LoginSlidePayload } from "@/features/login-slides/types";

export class LoginSlideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginSlideValidationError";
  }
}

const localizedCopySchema = z.object({
  body: z.string().trim().min(8).max(260),
  eyebrow: z.string().trim().min(2).max(40),
  imageAlt: z.string().trim().max(140),
  title: z.string().trim().min(2).max(90),
});

const requestSchema = z.object({
  id: z.string().nullable().refine((value) => value === null || isUuid(value), {
    message: "id must be null or a valid UUID.",
  }),
  imageUrl: z.string().trim().url(),
  isActive: z.boolean(),
  localized: z.object({
    en: localizedCopySchema,
    fi: localizedCopySchema,
  }),
  sortOrder: z.string().trim().regex(/^\d+$/),
});

const parseHttpUrlOrThrow = (value: string, fieldName: string): string => {
  const trimmedValue = value.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new LoginSlideValidationError(`${fieldName} must be a valid absolute URL.`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new LoginSlideValidationError(`${fieldName} must use http or https.`);
  }

  return trimmedValue;
};

export const parseLoginSlidePayloadOrThrow = (value: unknown): LoginSlidePayload => {
  const parsed = requestSchema.safeParse(value);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "request";
    const message = firstIssue?.message ?? "Invalid login slide payload.";

    throw new LoginSlideValidationError(`${path}: ${message}`);
  }

  const sortOrderNumber = Number.parseInt(parsed.data.sortOrder, 10);

  if (sortOrderNumber > 1000) {
    throw new LoginSlideValidationError("sortOrder must be between 0 and 1000.");
  }

  return {
    ...parsed.data,
    imageUrl: parseHttpUrlOrThrow(parsed.data.imageUrl, "imageUrl"),
    localized: {
      en: {
        body: parsed.data.localized.en.body.trim(),
        eyebrow: parsed.data.localized.en.eyebrow.trim(),
        imageAlt: parsed.data.localized.en.imageAlt.trim(),
        title: parsed.data.localized.en.title.trim(),
      },
      fi: {
        body: parsed.data.localized.fi.body.trim(),
        eyebrow: parsed.data.localized.fi.eyebrow.trim(),
        imageAlt: parsed.data.localized.fi.imageAlt.trim(),
        title: parsed.data.localized.fi.title.trim(),
      },
    },
    sortOrder: parsed.data.sortOrder.trim(),
  };
};

export const parseLoginSlideIdOrThrow = (value: unknown): string => {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new LoginSlideValidationError("slideId must be a valid UUID.");
  }

  return value;
};
