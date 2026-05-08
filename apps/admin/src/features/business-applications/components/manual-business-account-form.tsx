"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type ManualBusinessAccountFormProps = {
  locale: DashboardLocale;
};

type CreateBusinessAccountResponse = {
  authUserCreated?: boolean;
  businessSlug?: string;
  message?: string;
  ownerEmail?: string;
  status?: string;
};

const copyByLocale = {
  en: {
    address: "Address",
    body: "Create the venue, owner login and owner membership in one admin-controlled flow. No recovery link is generated.",
    businessName: "Business name",
    city: "City",
    contactEmail: "Business contact email",
    country: "Country",
    create: "Create business account",
    creating: "Creating account...",
    instagramUrl: "Instagram URL",
    ownerEmail: "Owner email",
    ownerName: "Owner name",
    ownerPassword: "Owner password",
    phone: "Phone",
    successExisting: "Business account created and existing owner login updated.",
    successNew: "Business account and new owner login created.",
    title: "Create owner account manually",
    websiteUrl: "Website URL",
    yTunnus: "Y-tunnus",
  },
  fi: {
    address: "Osoite",
    body: "Luo yritys, omistajan kirjautumistunnus ja omistajajäsenyys yhdellä adminin hallitsemalla lomakkeella. Palautuslinkkiä ei luoda.",
    businessName: "Yrityksen nimi",
    city: "Kaupunki",
    contactEmail: "Yrityksen yhteyssähköposti",
    country: "Maa",
    create: "Luo yritystili",
    creating: "Luodaan tiliä...",
    instagramUrl: "Instagram URL",
    ownerEmail: "Omistajan sähköposti",
    ownerName: "Omistajan nimi",
    ownerPassword: "Omistajan salasana",
    phone: "Puhelin",
    successExisting: "Yritystili luotiin ja olemassa oleva omistajatunnus päivitettiin.",
    successNew: "Yritystili ja uusi omistajatunnus luotiin.",
    title: "Luo omistajatili käsin",
    websiteUrl: "Verkkosivu URL",
    yTunnus: "Y-tunnus",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

const readFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

const postBusinessAccountAsync = async (formData: FormData): Promise<CreateBusinessAccountResponse> => {
  const response = await fetch("/api/admin/business-accounts/create", {
    body: JSON.stringify({
      address: readFormValue(formData, "address"),
      businessName: readFormValue(formData, "businessName"),
      city: readFormValue(formData, "city"),
      contactEmail: readFormValue(formData, "contactEmail"),
      country: readFormValue(formData, "country"),
      instagramUrl: readFormValue(formData, "instagramUrl"),
      ownerEmail: readFormValue(formData, "ownerEmail"),
      ownerName: readFormValue(formData, "ownerName"),
      ownerPassword: readFormValue(formData, "ownerPassword"),
      phone: readFormValue(formData, "phone"),
      websiteUrl: readFormValue(formData, "websiteUrl"),
      yTunnus: readFormValue(formData, "yTunnus"),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as CreateBusinessAccountResponse;

  if (!response.ok) {
    throw new Error(
      typeof responseBody.message === "string" ? responseBody.message : "Business account creation failed."
    );
  }

  return responseBody;
};

export const ManualBusinessAccountForm = ({ locale }: ManualBusinessAccountFormProps) => {
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
      const response = await postBusinessAccountAsync(formData);
      const baseMessage = response.authUserCreated === false ? copy.successExisting : copy.successNew;
      const ownerLabel = typeof response.ownerEmail === "string" ? ` Owner: ${response.ownerEmail}.` : "";
      const businessLabel = typeof response.businessSlug === "string" ? ` Slug: ${response.businessSlug}.` : "";

      formElement.reset();
      setSuccessMessage(`${baseMessage}${ownerLabel}${businessLabel}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown business account creation error.");
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
            <span className="field-label">{copy.businessName}</span>
            <input className="field-input" name="businessName" required type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.contactEmail}</span>
            <input autoComplete="email" className="field-input" name="contactEmail" type="email" />
          </label>
          <label className="field">
            <span className="field-label">{copy.yTunnus}</span>
            <input autoComplete="off" className="field-input" name="yTunnus" placeholder="1234567-8" type="text" />
          </label>
          <label className="field">
            <span className="field-label">{copy.phone}</span>
            <input autoComplete="tel" className="field-input" name="phone" type="tel" />
          </label>
          <label className="field">
            <span className="field-label">{copy.address}</span>
            <input className="field-input" name="address" required type="text" />
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
