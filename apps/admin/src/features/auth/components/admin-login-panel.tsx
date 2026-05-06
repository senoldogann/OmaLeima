"use client";

import Image from "next/image";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

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

const GoogleIcon = (): ReactElement => (
  <svg aria-hidden="true" className="button-icon" viewBox="0 0 24 24">
    <path
      d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.37a4.58 4.58 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 3-4.28 3-7.5Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.7 0 4.96-.9 6.6-2.43l-3.22-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.8-1.76-5.6-4.12H3.08v2.58A9.98 9.98 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path d="M6.4 13.9a6.01 6.01 0 0 1 0-3.8V7.52H3.08a10 10 0 0 0 0 8.96L6.4 13.9Z" fill="#FBBC05" />
    <path
      d="M12 5.98c1.47 0 2.8.5 3.84 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a9.98 9.98 0 0 0-8.92 5.52L6.4 10.1C7.2 7.74 9.4 5.98 12 5.98Z"
      fill="#EA4335"
    />
  </svg>
);

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
  turnstileSiteKey: string | null;
};

const turnstileAction = "admin_login";

export const AdminLoginPanel = ({ isProtectionRequired, turnstileSiteKey }: AdminLoginPanelProps) => {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isPasswordPending, setIsPasswordPending] = useState<boolean>(false);
  const [isGooglePending, setIsGooglePending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(searchParams.get("error"));
  const hasTurnstileSiteKey = typeof turnstileSiteKey === "string" && turnstileSiteKey.length > 0;
  const isProtectionUnavailable = isProtectionRequired && !hasTurnstileSiteKey;

  const readTurnstileToken = (): string => {
    const hiddenInput = turnstileContainerRef.current?.querySelector<HTMLInputElement>(
      'input[name="cf-turnstile-response"]'
    );

    return hiddenInput?.value.trim() ?? "";
  };

  const resetTurnstile = (): void => {
    window.turnstile?.reset();
  };

  const verifyLoginProtectionAsync = async (): Promise<boolean> => {
    if (isProtectionUnavailable) {
      setErrorMessage("Login protection is not configured.");
      return false;
    }

    const turnstileToken = readTurnstileToken();

    if (hasTurnstileSiteKey && turnstileToken.length === 0) {
      setErrorMessage("Complete the Cloudflare verification first.");
      return false;
    }

    const response = await fetch("/api/auth/turnstile", {
      body: JSON.stringify({
        turnstileToken,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    const responseBody = (await response.json()) as unknown;

    if (!response.ok) {
      const message =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        typeof responseBody.error === "string"
          ? responseBody.error
          : "Login verification failed.";

      setErrorMessage(message);
      resetTurnstile();
      return false;
    }

    return true;
  };

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPasswordPending(true);
    setErrorMessage(null);

    const isVerified = await verifyLoginProtectionAsync();

    if (!isVerified) {
      setIsPasswordPending(false);
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error !== null) {
      setErrorMessage(signInResult.error.message);
      resetTurnstile();
      setIsPasswordPending(false);
      return;
    }

    const session = signInResult.data.session;

    if (session === null) {
      setErrorMessage("Password sign-in returned without a session.");
      resetTurnstile();
      setIsPasswordPending(false);
      return;
    }

    const sessionResponse = await fetch("/auth/password-session", {
      body: JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
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

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsGooglePending(true);
    setErrorMessage(null);

    const isVerified = await verifyLoginProtectionAsync();

    if (!isVerified) {
      setIsGooglePending(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const signInResult = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (signInResult.error !== null) {
      setErrorMessage(signInResult.error.message);
      resetTurnstile();
      setIsGooglePending(false);
    }
  };

  return (
    <div className="auth-grid">
      <section className="auth-visual" aria-label="OmaLeima operations">
        <div className="auth-visual-copy">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <Image alt="" className="brand-logo" height={44} priority src="/images/omaleima-logo.png" width={44} />
            </span>
            <div>
              <div className="eyebrow">OmaLeima</div>
              <h1 className="auth-title">Operations</h1>
            </div>
          </div>
          <p>Events, leimat and reward handoffs in one clean operator panel.</p>
        </div>
      </section>

      <section className="panel">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Login</div>
            <h2 className="section-title">Open dashboard</h2>
          </div>

          <button
            className="button button-secondary"
            disabled={isGooglePending || isPasswordPending}
            onClick={() => void handleGoogleSignIn()}
            type="button"
          >
            <GoogleIcon />
            {isGooglePending ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="divider" />

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

            <button className="button button-primary" disabled={isPasswordPending || isGooglePending || isProtectionUnavailable} type="submit">
              <KeyIcon />
              {isPasswordPending ? "Signing in..." : "Sign in with password"}
            </button>
          </form>

          {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}
        </div>
      </section>
    </div>
  );
};
