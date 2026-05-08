"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type ManualOrganizationAccountFormProps = {
  locale: DashboardLocale;
};

type CreateOrganizationAccountResponse = {
  authUserCreated?: boolean;
  clubSlug?: string;
  message?: string;
  ownerEmail?: string;
  status?: string;
};

const copyByLocale = {
  en: {
    address: "Address",
    announcement: "Public announcement",
    body: "Create the organization profile, owner login and owner membership in one admin-controlled flow. Use this for student clubs, guilds and event organizers.",
    city: "City",
    contactEmail: "Organization contact email",
    country: "Country",
    coverImageUrl: "Banner image URL",
    create: "Create organization account",
    creating: "Creating account...",
    instagramUrl: "Instagram URL",
    logoUrl: "Logo image URL",
    organizationName: "Organization name",
    ownerEmail: "Owner email",
    ownerName: "Owner name",
    ownerPassword: "Owner password",
    phone: "Phone",
    successNew: "Organization account and new owner login created.",
    title: "Create organization owner account manually",
    universityName: "University or school",
    websiteUrl: "Website URL",
  },
  fi: {
    address: "Osoite",
    announcement: "Julkinen tiedote",
    body: "Luo organisaatioprofiili, omistajan kirjautumistunnus ja omistajajäsenyys yhdellä adminin hallitsemalla lomakkeella. Käytä tätä opiskelijajärjestöille, killoille ja tapahtumajärjestäjille.",
    city: "Kaupunki",
    contactEmail: "Organisaation yhteyssähköposti",
    country: "Maa",
    coverImageUrl: "Bannerikuvan URL",
    create: "Luo organisaatiotili",
    creating: "Luodaan tiliä...",
    instagramUrl: "Instagram URL",
    logoUrl: "Logokuvan URL",
    organizationName: "Organisaation nimi",
    ownerEmail: "Omistajan sähköposti",
    ownerName: "Omistajan nimi",
    ownerPassword: "Omistajan salasana",
    phone: "Puhelin",
    successNew: "Organisaatiotili ja uusi omistajatunnus luotiin.",
    title: "Luo organisaation omistajatili käsin",
    universityName: "Yliopisto tai oppilaitos",
    websiteUrl: "Verkkosivu URL",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

const readFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

const postOrganizationAccountAsync = async (formData: FormData): Promise<CreateOrganizationAccountResponse> => {
  const response = await fetch("/api/admin/club-accounts/create", {
    body: JSON.stringify({
      address: readFormValue(formData, "address"),
      announcement: readFormValue(formData, "announcement"),
      city: readFormValue(formData, "city"),
      clubName: readFormValue(formData, "clubName"),
      contactEmail: readFormValue(formData, "contactEmail"),
      country: readFormValue(formData, "country"),
      coverImageUrl: readFormValue(formData, "coverImageUrl"),
      instagramUrl: readFormValue(formData, "instagramUrl"),
      logoUrl: readFormValue(formData, "logoUrl"),
      ownerEmail: readFormValue(formData, "ownerEmail"),
      ownerName: readFormValue(formData, "ownerName"),
      ownerPassword: readFormValue(formData, "ownerPassword"),
      phone: readFormValue(formData, "phone"),
      universityName: readFormValue(formData, "universityName"),
      websiteUrl: readFormValue(formData, "websiteUrl"),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as CreateOrganizationAccountResponse;

  if (!response.ok) {
    throw new Error(
      typeof responseBody.message === "string" ? responseBody.message : "Organization account creation failed."
    );
  }

  return responseBody;
};

export const ManualOrganizationAccountForm = ({ locale }: ManualOrganizationAccountFormProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const [isPending, setIsPending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useTransientSuccessKey(successMessage, () => setSuccessMessage(null), successNoticeDurationMs);

  const handleSubmitAsync = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setIsPending(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await postOrganizationAccountAsync(formData);
      const ownerLabel = typeof response.ownerEmail === "string" ? ` Owner: ${response.ownerEmail}.` : "";
      const clubLabel = typeof response.clubSlug === "string" ? ` Slug: ${response.clubSlug}.` : "";

      formElement.reset();
      setSuccessMessage(`${copy.successNew}${ownerLabel}${clubLabel}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown organization account creation error.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="panel panel-accent stack-md">
      <div className="stack-sm">
        <div className="eyebrow">{copy.title}</div>
        <p className="muted-text">{copy.body}</p>
      </div>

      <form className="stack-md" onSubmit={(event) => void handleSubmitAsync(event)}>
        <div className="content-grid">
          <label className="field">
            <span className="field-label">{copy.ownerName}</span>
            <input className="field-input" name="ownerName" required type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.ownerEmail}</span>
            <input autoComplete="email" className="field-input" name="ownerEmail" required type="email" />
          </label>
          <label className="field">
            <span className="field-label">{copy.ownerPassword}</span>
            <input autoComplete="new-password" className="field-input" minLength={10} name="ownerPassword" required type="password" />
          </label>
          <label className="field">
            <span className="field-label">{copy.organizationName}</span>
            <input className="field-input" name="clubName" required type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.contactEmail}</span>
            <input autoComplete="email" className="field-input" name="contactEmail" type="email" />
          </label>
          <label className="field">
            <span className="field-label">{copy.universityName}</span>
            <input className="field-input" name="universityName" type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.phone}</span>
            <input autoComplete="tel" className="field-input" name="phone" type="tel" />
          </label>
          <label className="field">
            <span className="field-label">{copy.address}</span>
            <input className="field-input" name="address" type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.city}</span>
            <input className="field-input" name="city" required type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.country}</span>
            <input className="field-input" name="country" required type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.websiteUrl}</span>
            <input className="field-input" name="websiteUrl" type="url" />
          </label>
          <label className="field">
            <span className="field-label">{copy.instagramUrl}</span>
            <input className="field-input" name="instagramUrl" type="url" />
          </label>
          <label className="field">
            <span className="field-label">{copy.logoUrl}</span>
            <input className="field-input" name="logoUrl" type="url" />
          </label>
          <label className="field">
            <span className="field-label">{copy.coverImageUrl}</span>
            <input className="field-input" name="coverImageUrl" type="url" />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">{copy.announcement}</span>
            <textarea className="field-input" name="announcement" rows={4} />
          </label>
        </div>

        <div className="action-row">
          <button className="button button-primary" disabled={isPending} type="submit">
            {isPending ? copy.creating : copy.create}
          </button>
          {successMessage !== null ? <p className="inline-success">{successMessage}</p> : null}
          {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}
        </div>
      </form>
    </section>
  );
};
