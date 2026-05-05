"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import type {
    ContactPageContent,
    ContactSubjectValue,
} from "@/features/public-site/contact-content";

type SubmissionState =
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "success" }
    | { kind: "error"; message: string };

type ContactFormProps = {
    apiPath: string;
    content: ContactPageContent;
    locale: "fi" | "en";
};

const allowedMimeTypes: ReadonlyArray<string> = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const maxAttachmentBytes = 5 * 1024 * 1024;

export const ContactForm = ({ apiPath, content, locale }: ContactFormProps) => {
    const formId = useId();
    const fieldId = (suffix: string): string => `${formId}-${suffix}`;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const startedAtRef = useRef<number>(0);

    useEffect(() => {
        // Render saflığını korumak için Date.now() yalnızca mount sonrasında okunur.
        startedAtRef.current = Date.now();
    }, []);

    const [state, setState] = useState<SubmissionState>({ kind: "idle" });
    const [attachmentName, setAttachmentName] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [consentChecked, setConsentChecked] = useState<boolean>(false);
    const [subjectValue, setSubjectValue] = useState<ContactSubjectValue | "">("");

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];

        if (!file) {
            setAttachmentName(null);
            return;
        }

        if (!allowedMimeTypes.includes(file.type)) {
            setFieldErrors((current) => ({
                ...current,
                attachment: locale === "fi"
                    ? "Vain JPG, PNG tai WebP -kuvia."
                    : "Only JPG, PNG or WebP images.",
            }));

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            setAttachmentName(null);
            return;
        }

        if (file.size > maxAttachmentBytes) {
            setFieldErrors((current) => ({
                ...current,
                attachment: locale === "fi"
                    ? "Tiedosto on liian suuri (max 5 MB)."
                    : "File is too large (max 5 MB).",
            }));

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            setAttachmentName(null);
            return;
        }

        setFieldErrors((current) => {
            if (!("attachment" in current)) {
                return current;
            }
            const next = { ...current };
            delete next.attachment;
            return next;
        });
        setAttachmentName(file.name);
    };

    const handleRemoveAttachment = (): void => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        setAttachmentName(null);
        setFieldErrors((current) => {
            if (!("attachment" in current)) {
                return current;
            }
            const next = { ...current };
            delete next.attachment;
            return next;
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        if (state.kind === "submitting") {
            return;
        }

        const formElement = event.currentTarget;
        const formData = new FormData(formElement);

        formData.set("locale", locale);
        formData.set(
            "elapsedMs",
            String(Math.max(0, Date.now() - startedAtRef.current)),
        );

        setState({ kind: "submitting" });
        setFieldErrors({});

        try {
            const response = await fetch(apiPath, {
                body: formData,
                method: "POST",
            });

            if (response.status === 429) {
                setState({ kind: "error", message: content.errorRateLimit });
                return;
            }

            if (response.status === 400) {
                const payload = (await response.json().catch(() => null)) as
                    | { fieldErrors?: Record<string, string> }
                    | null;

                setFieldErrors(payload?.fieldErrors ?? {});
                setState({ kind: "error", message: content.errorValidation });
                return;
            }

            if (!response.ok) {
                setState({ kind: "error", message: content.errorGeneric });
                return;
            }

            formElement.reset();
            setAttachmentName(null);
            setConsentChecked(false);
            setSubjectValue("");
            setState({ kind: "success" });
        } catch {
            setState({ kind: "error", message: content.errorGeneric });
        }
    };

    if (state.kind === "success") {
        return (
            <div className="contact-success" role="status">
                <h2>{content.successTitle}</h2>
                <p>{content.successBody}</p>
            </div>
        );
    }

    const isSubmitting = state.kind === "submitting";

    return (
        <form
            aria-busy={isSubmitting}
            className="contact-form"
            noValidate
            onSubmit={handleSubmit}
        >
            {/* Bot tuza\u011f\u0131: g\u00f6r\u00fcnmez alan, dolduran istek reddedilir */}
            <div aria-hidden="true" className="contact-honeypot">
                <label htmlFor={fieldId("website")}>{content.honeypotLabel}</label>
                <input
                    autoComplete="off"
                    id={fieldId("website")}
                    name="website"
                    tabIndex={-1}
                    type="text"
                />
            </div>

            <div className="contact-row">
                <label className="contact-field" htmlFor={fieldId("subject")}>
                    <span className="contact-label">
                        {content.subjectLabel}
                        <span aria-hidden="true" className="contact-required">*</span>
                    </span>
                    <select
                        aria-describedby={fieldId("subject-hint")}
                        aria-invalid={fieldErrors.subject ? "true" : "false"}
                        id={fieldId("subject")}
                        name="subject"
                        onChange={(event) => {
                            setSubjectValue(event.target.value as ContactSubjectValue);
                        }}
                        required
                        value={subjectValue}
                    >
                        <option disabled value="">
                            {locale === "fi" ? "Valitse aihe" : "Select a topic"}
                        </option>
                        {content.subjectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <span className="contact-hint" id={fieldId("subject-hint")}>
                        {fieldErrors.subject ?? content.subjectHint}
                    </span>
                </label>
            </div>

            <div className="contact-row contact-row-split">
                <label className="contact-field" htmlFor={fieldId("name")}>
                    <span className="contact-label">
                        {content.nameLabel}
                        <span aria-hidden="true" className="contact-required">*</span>
                    </span>
                    <input
                        aria-describedby={fieldId("name-hint")}
                        aria-invalid={fieldErrors.name ? "true" : "false"}
                        autoComplete="name"
                        id={fieldId("name")}
                        maxLength={120}
                        minLength={2}
                        name="name"
                        required
                        type="text"
                    />
                    <span className="contact-hint" id={fieldId("name-hint")}>
                        {fieldErrors.name ?? content.nameHint}
                    </span>
                </label>

                <label className="contact-field" htmlFor={fieldId("email")}>
                    <span className="contact-label">
                        {content.emailLabel}
                        <span aria-hidden="true" className="contact-required">*</span>
                    </span>
                    <input
                        aria-describedby={fieldId("email-hint")}
                        aria-invalid={fieldErrors.email ? "true" : "false"}
                        autoComplete="email"
                        id={fieldId("email")}
                        inputMode="email"
                        maxLength={200}
                        name="email"
                        required
                        type="email"
                    />
                    <span className="contact-hint" id={fieldId("email-hint")}>
                        {fieldErrors.email ?? content.emailHint}
                    </span>
                </label>
            </div>

            <div className="contact-row">
                <label className="contact-field" htmlFor={fieldId("organization")}>
                    <span className="contact-label">{content.organizationLabel}</span>
                    <input
                        aria-describedby={fieldId("organization-hint")}
                        aria-invalid={fieldErrors.organization ? "true" : "false"}
                        autoComplete="organization"
                        id={fieldId("organization")}
                        maxLength={200}
                        name="organization"
                        type="text"
                    />
                    <span className="contact-hint" id={fieldId("organization-hint")}>
                        {fieldErrors.organization ?? content.organizationHint}
                    </span>
                </label>
            </div>

            <div className="contact-row">
                <label className="contact-field" htmlFor={fieldId("message")}>
                    <span className="contact-label">
                        {content.messageLabel}
                        <span aria-hidden="true" className="contact-required">*</span>
                    </span>
                    <textarea
                        aria-describedby={fieldId("message-hint")}
                        aria-invalid={fieldErrors.message ? "true" : "false"}
                        id={fieldId("message")}
                        maxLength={5000}
                        minLength={10}
                        name="message"
                        required
                        rows={6}
                    />
                    <span className="contact-hint" id={fieldId("message-hint")}>
                        {fieldErrors.message ?? content.messageHint}
                    </span>
                </label>
            </div>

            <div className="contact-row">
                <div className="contact-field">
                    <span className="contact-label">{content.attachmentLabel}</span>
                    <div className="contact-attachment">
                        <input
                            accept="image/jpeg,image/png,image/webp"
                            aria-describedby={fieldId("attachment-hint")}
                            aria-invalid={fieldErrors.attachment ? "true" : "false"}
                            id={fieldId("attachment")}
                            name="attachment"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            type="file"
                        />
                        {attachmentName !== null ? (
                            <div className="contact-attachment-preview">
                                <span>{attachmentName}</span>
                                <button
                                    className="contact-attachment-remove"
                                    onClick={handleRemoveAttachment}
                                    type="button"
                                >
                                    {content.removeAttachmentLabel}
                                </button>
                            </div>
                        ) : null}
                    </div>
                    <span className="contact-hint" id={fieldId("attachment-hint")}>
                        {fieldErrors.attachment ?? content.attachmentHint}
                    </span>
                </div>
            </div>

            <div className="contact-row">
                <label className="contact-consent" htmlFor={fieldId("consent")}>
                    <input
                        checked={consentChecked}
                        id={fieldId("consent")}
                        name="consent"
                        onChange={(event) => setConsentChecked(event.target.checked)}
                        required
                        type="checkbox"
                        value="yes"
                    />
                    <span>
                        {content.consentLabel}{" "}
                        <a className="contact-consent-link" href={content.privacyHref}>
                            {content.consentLinkLabel}
                        </a>
                    </span>
                </label>
            </div>

            {state.kind === "error" ? (
                <p className="contact-error" role="alert">
                    {state.message}
                </p>
            ) : null}

            <div className="contact-actions">
                <button className="contact-submit" disabled={isSubmitting} type="submit">
                    {isSubmitting ? content.submittingLabel : content.submitLabel}
                </button>
            </div>
        </form>
    );
};
