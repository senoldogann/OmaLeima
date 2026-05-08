"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { getLoginSlideLocalizedCopy, type LoginSlideRecord } from "@/features/login-slides/types";

type PasswordSessionResponseBody =
  | {
      homeHref: string;
    }
  | {
      error: string;
    };

const isPasswordSessionResponseBody = (value: unknown): value is PasswordSessionResponseBody =>
  typeof value === "object" &&
  value !== null &&
  (("homeHref" in value && typeof value.homeHref === "string") ||
    ("error" in value && typeof value.error === "string"));

type TurnstileApi = {
  reset: () => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const KeyIcon = (): ReactElement => (
  <svg aria-hidden="true" className="button-icon" viewBox="0 0 24 24">
    <path
      d="M14.5 8.5a5 5 0 1 0-4.1 4.92l1.18 1.18h2.02v2.02h2.02v2.02H19v-3.38l-4.5-4.5a4.98 4.98 0 0 0 0-2.26Zm-7 1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
      fill="currentColor"
    />
  </svg>
);

type AdminLoginPanelProps = {
  isProtectionRequired: boolean;
  locale: DashboardLocale;
  slides: LoginSlideRecord[];
  turnstileSiteKey: string | null;
};

const turnstileAction = "admin_login";
const instagramHref = "https://www.instagram.com/omaleima/";

const loginFooterCopyByLocale = {
  en: {
    contact: "Support",
    instagram: "Instagram",
    privacy: "Privacy",
    terms: "Terms",
  },
  fi: {
    contact: "Tuki",
    instagram: "Instagram",
    privacy: "Tietosuoja",
    terms: "Käyttöehdot",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

export const AdminLoginPanel = ({ isProtectionRequired, locale, slides, turnstileSiteKey }: AdminLoginPanelProps) => {
  const searchParams = useSearchParams();
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const searchErrorMessage = searchParams.get("error");
  const sessionParam = searchParams.get("session");
  const sessionMessage =
    sessionParam === "expired"
      ? "Your session expired. Sign in again to continue."
      : sessionParam === "suspended"
        ? "This account was set to passive. Ask a platform admin to activate it before signing in again."
        : null;
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isPasswordPending, setIsPasswordPending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(searchErrorMessage ?? sessionMessage);
  const hasTurnstileSiteKey = typeof turnstileSiteKey === "string" && turnstileSiteKey.length > 0;
  const isProtectionUnavailable = isProtectionRequired && !hasTurnstileSiteKey;
  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? null;
  const activeSlideCopy =
    activeSlide === null ? null : getLoginSlideLocalizedCopy(activeSlide, locale);
  const footerCopy = loginFooterCopyByLocale[locale];

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  const readTurnstileToken = (): string => {
    const hiddenInput = turnstileContainerRef.current?.querySelector<HTMLInputElement>(
      'input[name="cf-turnstile-response"]'
    );

    return hiddenInput?.value.trim() ?? "";
  };

  const resetTurnstile = (): void => {
    window.turnstile?.reset();
  };

  const readLoginProtectionToken = (): string | null => {
    if (isProtectionUnavailable) {
      setErrorMessage("Login protection is not configured.");
      return null;
    }

    const turnstileToken = readTurnstileToken();

    if (hasTurnstileSiteKey && turnstileToken.length === 0) {
      setErrorMessage("Complete the Cloudflare verification first.");
      return null;
    }

    return turnstileToken;
  };

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPasswordPending(true);
    setErrorMessage(null);

    const turnstileToken = readLoginProtectionToken();

    if (turnstileToken === null) {
      setIsPasswordPending(false);
      return;
    }

    const sessionResponse = await fetch("/auth/password-session", {
      body: JSON.stringify({
        email,
        password,
        turnstileToken,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    const responseBody: unknown = await sessionResponse.json();

    if (!isPasswordSessionResponseBody(responseBody)) {
      setErrorMessage("Password session response had an unexpected shape.");
      resetTurnstile();
      setIsPasswordPending(false);
      return;
    }

    if (!sessionResponse.ok || "error" in responseBody) {
      setErrorMessage("error" in responseBody ? responseBody.error : "Password session could not be persisted.");
      resetTurnstile();
      setIsPasswordPending(false);
      return;
    }

    window.location.assign(responseBody.homeHref);
  };

  return (
    <div className="auth-grid">
      <section
        className="auth-visual"
        aria-label="OmaLeima operations"
        style={activeSlide === null ? undefined : { backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.82) 78%), url("${activeSlide.imageUrl}")` }}
      >
        <div className="auth-visual-copy">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <Image alt="" className="brand-logo" height={44} priority src="/images/omaleima-logo.png" width={44} />
            </span>
            <div>
              <div className="eyebrow">{activeSlideCopy?.eyebrow ?? "OmaLeima"}</div>
              <h1 className="auth-title">{activeSlideCopy?.title ?? "Operations"}</h1>
            </div>
          </div>
          <p>{activeSlideCopy?.body ?? "Events, leimat and reward handoffs in one clean operator panel."}</p>
          {slides.length > 1 ? (
            <div className="auth-slide-dots" aria-label="Login slide selector">
              {slides.map((slide, index) => {
                const slideCopy = getLoginSlideLocalizedCopy(slide, locale);

                return (
                  <button
                    aria-label={`Show slide ${index + 1}: ${slideCopy.title}`}
                    aria-pressed={index === activeSlideIndex}
                    className={index === activeSlideIndex ? "auth-slide-dot auth-slide-dot-active" : "auth-slide-dot"}
                    key={slide.id}
                    onClick={() => setActiveSlideIndex(index)}
                    type="button"
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Login</div>
            <h2 className="section-title">Open dashboard</h2>
          </div>

          <form className="stack-md" onSubmit={(event) => void handlePasswordSignIn(event)}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                autoComplete="email"
                className="field-input"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                autoComplete="current-password"
                className="field-input"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {hasTurnstileSiteKey ? (
              <div className="login-turnstile">
                <Script
                  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                  strategy="afterInteractive"
                />
                <span className="field-label">Cloudflare protection</span>
                <div
                  className="cf-turnstile"
                  data-action={turnstileAction}
                  data-sitekey={turnstileSiteKey}
                  data-theme="dark"
                  ref={turnstileContainerRef}
                />
              </div>
            ) : null}

            {isProtectionUnavailable ? (
              <p className="inline-error">Login protection is not configured.</p>
            ) : null}

            <button className="button button-primary" disabled={isPasswordPending || isProtectionUnavailable} type="submit">
              <KeyIcon />
              {isPasswordPending ? "Signing in..." : "Sign in with password"}
            </button>
          </form>

          {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}

          <nav className="auth-legal-links" aria-label={locale === "fi" ? "Kirjautumissivun linkit" : "Login page links"}>
            <Link href={locale === "fi" ? "/terms" : "/en/terms"}>{footerCopy.terms}</Link>
            <Link href={locale === "fi" ? "/privacy" : "/en/privacy"}>{footerCopy.privacy}</Link>
            <Link href={locale === "fi" ? "/contact" : "/en/contact"}>{footerCopy.contact}</Link>
            <a href={instagramHref} rel="noreferrer" target="_blank">
              {footerCopy.instagram}
            </a>
          </nav>
        </div>
      </section>
    </div>
  );
};
