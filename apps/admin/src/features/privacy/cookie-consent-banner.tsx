"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  cookieConsentChangedEventName,
  cookieConsentCookieName,
  cookieConsentVersion,
  getCookieConsentCopy,
  type CookiePreferenceValue,
} from "@/features/privacy/cookie-consent";
import {
  getPublicPrivacyHref,
  getPublicTermsHref,
  type PublicLocale,
} from "@/features/public-site/site-config";

type StoredCookieConsent = {
  value: CookiePreferenceValue;
  version: string;
};

const cookieMaxAgeSeconds = 60 * 60 * 24 * 180;

const isPublicLocale = (value: string): value is PublicLocale =>
  value === "fi" || value === "en";

const getLocaleFromPathname = (pathname: string): PublicLocale => {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "fi";

  if (isPublicLocale(firstSegment)) {
    return firstSegment;
  }

  return "fi";
};

const serializeConsent = (value: CookiePreferenceValue): string =>
  encodeURIComponent(`${cookieConsentVersion}:${value}`);

const parseConsent = (rawCookieValue: string): StoredCookieConsent | null => {
  const decodedValue = decodeURIComponent(rawCookieValue);
  const [version, value] = decodedValue.split(":");

  if (version !== cookieConsentVersion) {
    return null;
  }

  if (value !== "essential" && value !== "all") {
    return null;
  }

  return {
    value,
    version,
  };
};

const readCookieConsent = (): StoredCookieConsent | null => {
  const cookieEntries = document.cookie.split(";").map((entry) => entry.trim());
  const consentEntry = cookieEntries.find((entry) => entry.startsWith(`${cookieConsentCookieName}=`));

  if (typeof consentEntry !== "string") {
    return null;
  }

  const [, rawValue] = consentEntry.split("=");

  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return null;
  }

  return parseConsent(rawValue);
};

const writeCookieConsent = (value: CookiePreferenceValue): void => {
  const cookieParts = [
    `${cookieConsentCookieName}=${serializeConsent(value)}`,
    `Max-Age=${cookieMaxAgeSeconds}`,
    "Path=/",
    "SameSite=Lax",
  ];

  if (window.location.protocol === "https:") {
    cookieParts.push("Secure");
  }

  document.cookie = cookieParts.join("; ");
};

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedPreference, setSelectedPreference] = useState<CookiePreferenceValue>("essential");
  const [locale, setLocale] = useState<PublicLocale>(() => {
    if (typeof window === "undefined") {
      return "fi";
    }

    return getLocaleFromPathname(window.location.pathname);
  });

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      const storedConsent = readCookieConsent();

      if (storedConsent === null) {
        return;
      }

      setSelectedPreference(storedConsent.value);
      setIsVisible(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOpenSettings = (): void => {
      const storedConsent = readCookieConsent();

      if (storedConsent !== null) {
        setSelectedPreference(storedConsent.value);
      }

      setLocale(getLocaleFromPathname(window.location.pathname));
      setIsSettingsOpen(true);
      setIsVisible(true);
    };

    window.addEventListener(cookieConsentChangedEventName, handleOpenSettings);

    return () => {
      window.removeEventListener(cookieConsentChangedEventName, handleOpenSettings);
    };
  }, []);

  const copy = getCookieConsentCopy(locale);
  const privacyHref = getPublicPrivacyHref(locale);
  const termsHref = getPublicTermsHref(locale);

  const handleSave = (value: CookiePreferenceValue): void => {
    writeCookieConsent(value);
    setSelectedPreference(value);
    setIsVisible(false);
    setIsSettingsOpen(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <section aria-label={copy.title} className="cookie-consent-shell">
      <div className="cookie-consent-card" role="dialog" aria-modal={isSettingsOpen}>
        <div className="cookie-consent-copy">
          <p className="cookie-consent-eyebrow">OmaLeima</p>
          <h2>{isSettingsOpen ? copy.settingsTitle : copy.title}</h2>
          <p>{isSettingsOpen ? copy.settingsBody : copy.body}</p>
          <div className="cookie-consent-links">
            <Link href={privacyHref}>{copy.privacyLabel}</Link>
            <Link href={termsHref}>{copy.termsLabel}</Link>
          </div>
        </div>

        {isSettingsOpen ? (
          <div className="cookie-preference-list">
            <div className="cookie-preference-row">
              <div>
                <strong>{copy.essentialLabel}</strong>
                <span>{copy.essentialBody}</span>
              </div>
              <span className="cookie-preference-pill">On</span>
            </div>
            <label className="cookie-preference-row cookie-preference-row-clickable">
              <span>
                <strong>{copy.analyticsLabel}</strong>
                <span>{copy.analyticsBody}</span>
              </span>
              <input
                checked={selectedPreference === "all"}
                onChange={(event) => setSelectedPreference(event.target.checked ? "all" : "essential")}
                type="checkbox"
              />
            </label>
          </div>
        ) : null}

        <div className="cookie-consent-actions">
          {isSettingsOpen ? (
            <>
              <button className="button button-secondary cookie-action-button" onClick={() => setIsVisible(false)} type="button">
                {copy.closeLabel}
              </button>
              <button className="button button-primary cookie-action-button" onClick={() => handleSave(selectedPreference)} type="button">
                {copy.saveLabel}
              </button>
            </>
          ) : (
            <>
              <button className="button button-secondary cookie-action-button" onClick={() => setIsSettingsOpen(true)} type="button">
                {copy.manageLabel}
              </button>
              <button className="button button-secondary cookie-action-button" onClick={() => handleSave("essential")} type="button">
                {copy.acceptEssentialLabel}
              </button>
              <button className="button button-primary cookie-action-button" onClick={() => handleSave("all")} type="button">
                {copy.acceptAllLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
