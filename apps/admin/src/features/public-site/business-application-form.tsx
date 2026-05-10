"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { BusinessApplicationContent } from "@/features/public-site/business-application-content";

type BusinessApplicationFormProps = {
  apiPath: string;
  content: BusinessApplicationContent;
  isProtectionRequired: boolean;
  turnstileSiteKey: string | null;
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

type FieldName =
  | "address"
  | "businessName"
  | "city"
  | "consent"
  | "contactEmail"
  | "contactName"
  | "country"
  | "instagramUrl"
  | "message"
  | "phone"
  | "turnstileToken"
  | "website"
  | "websiteUrl";

type FieldErrorMap = Partial<Record<FieldName, string>>;
type ServerResponseBody = {
  fieldErrors?: FieldErrorMap;
  message?: string;
};

type TurnstileApi = {
  reset: () => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const turnstileAction = "business_application";

const isFieldErrorMap = (value: unknown): value is FieldErrorMap =>
  typeof value === "object" && value !== null;

const isServerResponseBody = (value: unknown): value is ServerResponseBody =>
  typeof value === "object" && value !== null;

const readTurnstileToken = (formData: FormData): string =>
  String(formData.get("cf-turnstile-response") ?? "").trim();

const createFieldErrorMessage = (
  fieldName: FieldName,
  content: BusinessApplicationContent
): string => {
  const messages: Record<FieldName, string> = {
    address: content.requiredHint,
    businessName: content.requiredHint,
    city: content.requiredHint,
    consent: content.requiredHint,
    contactEmail: content.contactEmailHint,
    contactName: content.requiredHint,
    country: content.requiredHint,
    instagramUrl: content.instagramHint,
    message: content.messageHint,
    phone: content.phoneHint,
    turnstileToken: content.errorVerification,
    website: content.requiredHint,
    websiteUrl: content.websiteHint,
  };

  return messages[fieldName];
};

const createLocalizedFieldErrors = (
  serverFieldErrors: FieldErrorMap,
  content: BusinessApplicationContent
): FieldErrorMap => {
  const result: FieldErrorMap = {};
  const fieldNames = Object.keys(serverFieldErrors) as FieldName[];

  for (const fieldName of fieldNames) {
    result[fieldName] = createFieldErrorMessage(fieldName, content);
  }

  return result;
};

const createSubmissionErrorMessage = (
  responseBody: ServerResponseBody,
  content: BusinessApplicationContent
): string => {
  if (responseBody.message === "Validation failed.") {
    return content.errorValidation;
  }

  if (responseBody.message === "Verification failed.") {
    return content.errorVerification;
  }

  return content.errorGeneric;
};

export const BusinessApplicationForm = ({
  apiPath,
  content,
  isProtectionRequired,
  turnstileSiteKey,
}: BusinessApplicationFormProps) => {
  const formId = useId();
  const startedAtRef = useRef<number>(0);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const hasTurnstileSiteKey = typeof turnstileSiteKey === "string" && turnstileSiteKey.length > 0;
  const isProtectionUnavailable = isProtectionRequired && !hasTurnstileSiteKey;

  const fieldId = (name: FieldName): string => `${formId}-${name}`;

  const resetTurnstile = (): void => {
    window.turnstile?.reset();
  };

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (submissionState.kind !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSubmissionState({ kind: "idle" });
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [submissionState.kind]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFieldErrors({});
    setSubmissionState({ kind: "submitting" });
    const formElement = event.currentTarget;

    if (isProtectionUnavailable) {
      setSubmissionState({ kind: "error", message: content.protectionUnavailable });
      return;
    }

    const formData = new FormData(formElement);
    const turnstileToken = readTurnstileToken(formData);

    if (hasTurnstileSiteKey && turnstileToken.length === 0) {
      setFieldErrors({ turnstileToken: content.errorVerification });
      setSubmissionState({ kind: "error", message: content.errorVerification });
      return;
    }

    const payload = {
      address: String(formData.get("address") ?? ""),
      businessName: String(formData.get("businessName") ?? ""),
      city: String(formData.get("city") ?? ""),
      consent: formData.get("consent") === "yes" ? "yes" : "",
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      country: String(formData.get("country") ?? "Finland"),
      elapsedMs: Date.now() - startedAtRef.current,
      instagramUrl: String(formData.get("instagramUrl") ?? ""),
      message: String(formData.get("message") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      turnstileToken,
      website: String(formData.get("website") ?? ""),
      websiteUrl: String(formData.get("websiteUrl") ?? ""),
    };

    try {
      const response = await fetch(apiPath, {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const responseBody = (await response.json()) as unknown;
      const parsedResponseBody = isServerResponseBody(responseBody) ? responseBody : {};

      if (!response.ok) {
        if (isFieldErrorMap(parsedResponseBody.fieldErrors)) {
          setFieldErrors(createLocalizedFieldErrors(parsedResponseBody.fieldErrors, content));
        }

        setSubmissionState({
          kind: "error",
          message: createSubmissionErrorMessage(parsedResponseBody, content),
        });
        resetTurnstile();
        return;
      }

      setSubmissionState({ kind: "success" });
      formElement.reset();
      startedAtRef.current = Date.now();
      resetTurnstile();
    } catch {
      setSubmissionState({ kind: "error", message: content.errorGeneric });
      resetTurnstile();
    }
  };

  return (
    <form className="contact-form" onSubmit={(event) => void handleSubmit(event)}>
      <div aria-hidden="true" className="contact-honeypot">
        <label htmlFor={fieldId("website")}>Website</label>
        <input autoComplete="off" id={fieldId("website")} name="website" tabIndex={-1} type="text" />
      </div>

      <div className="contact-row contact-row-split">
        <label className="contact-field" htmlFor={fieldId("businessName")}>
          <span className="contact-label">
            {content.nameLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input id={fieldId("businessName")} name="businessName" required type="text" />
          <span className="contact-hint">{fieldErrors.businessName ?? content.nameHint}</span>
        </label>

        <label className="contact-field" htmlFor={fieldId("contactName")}>
          <span className="contact-label">
            {content.contactNameLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input id={fieldId("contactName")} name="contactName" required type="text" />
          <span className="contact-hint">{fieldErrors.contactName ?? content.contactNameHint}</span>
        </label>
      </div>

      <div className="contact-row contact-row-split">
        <label className="contact-field" htmlFor={fieldId("contactEmail")}>
          <span className="contact-label">
            {content.contactEmailLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input autoComplete="email" id={fieldId("contactEmail")} name="contactEmail" required type="email" />
          <span className="contact-hint">{fieldErrors.contactEmail ?? content.contactEmailHint}</span>
        </label>

        <label className="contact-field" htmlFor={fieldId("phone")}>
          <span className="contact-label">{content.phoneLabel}</span>
          <input autoComplete="tel" id={fieldId("phone")} name="phone" type="text" />
          <span className="contact-hint">{fieldErrors.phone ?? content.phoneHint}</span>
        </label>
      </div>

      <div className="contact-row">
        <label className="contact-field" htmlFor={fieldId("address")}>
          <span className="contact-label">
            {content.addressLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input id={fieldId("address")} name="address" required type="text" />
          <span className="contact-hint">{fieldErrors.address ?? content.addressHint}</span>
        </label>
      </div>

      <div className="contact-row contact-row-split">
        <label className="contact-field" htmlFor={fieldId("city")}>
          <span className="contact-label">
            {content.cityLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input id={fieldId("city")} name="city" required type="text" />
          <span className="contact-hint">{fieldErrors.city ?? content.cityHint}</span>
        </label>

        <label className="contact-field" htmlFor={fieldId("country")}>
          <span className="contact-label">
            {content.countryLabel}
            <span aria-hidden="true" className="contact-required">*</span>
          </span>
          <input defaultValue="Finland" id={fieldId("country")} name="country" required type="text" />
          <span className="contact-hint">{fieldErrors.country ?? content.requiredHint}</span>
        </label>
      </div>

      <div className="contact-row">
        <label className="contact-field" htmlFor={fieldId("message")}>
          <span className="contact-label">{content.messageLabel}</span>
          <textarea id={fieldId("message")} name="message" rows={5} />
          <span className="contact-hint">{fieldErrors.message ?? content.messageHint}</span>
        </label>
      </div>

      <div className="contact-row">
        <label className="contact-consent" htmlFor={fieldId("consent")}>
          <input id={fieldId("consent")} name="consent" required type="checkbox" value="yes" />
          <span>{content.consentLabel}</span>
        </label>
      </div>

      {hasTurnstileSiteKey ? (
        <div className="contact-turnstile">
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <span className="contact-label">{content.protectionLabel}</span>
          <div
            className="cf-turnstile"
            data-action={turnstileAction}
            data-sitekey={turnstileSiteKey}
            data-theme="dark"
          />
          {fieldErrors.turnstileToken ? <span className="contact-hint">{fieldErrors.turnstileToken}</span> : null}
        </div>
      ) : null}

      {isProtectionUnavailable ? (
        <p className="contact-error" role="alert">
          {content.protectionUnavailable}
        </p>
      ) : null}

      {submissionState.kind === "error" ? (
        <p className="contact-error" role="alert">
          {submissionState.message}
        </p>
      ) : null}

      {submissionState.kind === "success" ? (
        <div className="contact-success" role="status">
          <h2>{content.successTitle}</h2>
          <p>{content.successBody}</p>
        </div>
      ) : null}

      <button
        className="button button-primary contact-submit"
        disabled={submissionState.kind === "submitting"}
        type="submit"
      >
        {submissionState.kind === "submitting" ? content.submittingLabel : content.submitLabel}
      </button>
    </form>
  );
};
