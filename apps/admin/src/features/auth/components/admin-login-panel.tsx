"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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

export const AdminLoginPanel = () => {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isPasswordPending, setIsPasswordPending] = useState<boolean>(false);
  const [isGooglePending, setIsGooglePending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(searchParams.get("error"));

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPasswordPending(true);
    setErrorMessage(null);

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error !== null) {
      setErrorMessage(signInResult.error.message);
      setIsPasswordPending(false);
      return;
    }

    const session = signInResult.data.session;

    if (session === null) {
      setErrorMessage("Password sign-in returned without a session.");
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
      setIsPasswordPending(false);
      return;
    }

    if (!sessionResponse.ok || "error" in responseBody) {
      setErrorMessage("error" in responseBody ? responseBody.error : "Password session could not be persisted.");
      setIsPasswordPending(false);
      return;
    }

    window.location.assign(responseBody.homeHref);
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsGooglePending(true);
    setErrorMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const signInResult = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (signInResult.error !== null) {
      setErrorMessage(signInResult.error.message);
      setIsGooglePending(false);
    }
  };

  return (
    <div className="auth-grid">
      <section className="panel panel-hero">
        <div className="eyebrow">OmaLeima</div>
        <h1 className="panel-title">Admin and club operations</h1>
        <p className="panel-copy">
          Review business applications, manage event configuration, and open the role-specific dashboard tied to this
          Supabase session.
        </p>
        <div className="stack-sm">
          <div className="hero-metric">
            <span className="hero-metric-label">Phase</span>
            <span className="hero-metric-value">Admin foundation</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric-label">Access</span>
            <span className="hero-metric-value">Platform admin or club staff</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Login</div>
            <h2 className="section-title">Open the correct dashboard</h2>
            <p className="muted-text">Use an allowed Supabase admin or club account. Google OAuth is ready for hosted auth.</p>
          </div>

          <button
            className="button button-secondary"
            disabled={isGooglePending || isPasswordPending}
            onClick={() => void handleGoogleSignIn()}
            type="button"
          >
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

            <button className="button button-primary" disabled={isPasswordPending || isGooglePending} type="submit">
              {isPasswordPending ? "Signing in..." : "Sign in with password"}
            </button>
          </form>

          {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}
        </div>
      </section>
    </div>
  );
};
