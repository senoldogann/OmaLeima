"use client";

import { useState } from "react";

import type { OrganizationAccountRecord } from "@/features/business-applications/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import { FINLAND_CITY_OPTIONS, FINLAND_COUNTRY } from "@/features/location/finland";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type ManualOrganizationAccountFormProps = {
  locale: DashboardLocale;
  onOrganizationCreated?: (organization: OrganizationAccountRecord) => void;
};

type CreateOrganizationAccountResponse = {
  authUserCreated?: boolean;
  clubId?: string | null;
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
    coverImageUrl: "Banner image URL (optional)",
    create: "Create organization account",
    creating: "Creating account...",
    instagramUrl: "Instagram URL (optional)",
    logoUrl: "Logo image URL (optional)",
    organizationName: "Organization name",
    ownerEmail: "Owner email",
    ownerName: "Owner name",
    ownerPassword: "Owner password",
    phone: "Phone",
    successNew: "Organization account and new owner login created.",
    title: "Create organization owner account manually",
    universityName: "University or school",
    websiteUrl: "Website URL (optional)",
  },
  fi: {
    address: "Osoite",
    announcement: "Julkinen tiedote",
    body: "Luo organisaatioprofiili, omistajan kirjautumistunnus ja omistajajäsenyys yhdellä adminin hallitsemalla lomakkeella. Käytä tätä opiskelijajärjestöille, killoille ja tapahtumajärjestäjille.",
    city: "Kaupunki",
    contactEmail: "Organisaation yhteyssähköposti",
    country: "Maa",
    coverImageUrl: "Bannerikuvan URL (valinnainen)",
    create: "Luo organisaatiotili",
    creating: "Luodaan tiliä...",
    instagramUrl: "Instagram URL (valinnainen)",
    logoUrl: "Logokuvan URL (valinnainen)",
    organizationName: "Organisaation nimi",
    ownerEmail: "Omistajan sähköposti",
    ownerName: "Omistajan nimi",
    ownerPassword: "Omistajan salasana",
    phone: "Puhelin",
    successNew: "Organisaatiotili ja uusi omistajatunnus luotiin.",
    title: "Luo organisaation omistajatili käsin",
    universityName: "Yliopisto tai oppilaitos",
    websiteUrl: "Verkkosivu URL (valinnainen)",
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
      country: FINLAND_COUNTRY,
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

export const ManualOrganizationAccountForm = ({ locale, onOrganizationCreated }: ManualOrganizationAccountFormProps) => {
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
      const city = readFormValue(formData, "city");
      const clubName = readFormValue(formData, "clubName");
      const universityName = readFormValue(formData, "universityName");
      const createdAt = new Date().toISOString();

      formElement.reset();
      setSuccessMessage(`${copy.successNew}${ownerLabel}${clubLabel}`);
      if (typeof response.clubId === "string" && response.clubId.length > 0) {
        onOrganizationCreated?.({
          city: city.length > 0 ? city : null,
          country: FINLAND_COUNTRY,
          createdAt,
          id: response.clubId,
          name: clubName,
          ownerEmail: typeof response.ownerEmail === "string" ? response.ownerEmail : null,
          ownerName: readFormValue(formData, "ownerName"),
          slug: typeof response.clubSlug === "string" ? response.clubSlug : "",
          status: "ACTIVE",
          universityName: universityName.length > 0 ? universityName : null,
          updatedAt: createdAt,
        });
      }
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
            <select className="field-input" defaultValue="" name="city" required>
              <option disabled value="">
                {copy.city}
              </option>
              {FINLAND_CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{copy.country}</span>
            <input className="field-input" name="country" readOnly required type="text" value={FINLAND_COUNTRY} />
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
