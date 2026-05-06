import { randomUUID } from "node:crypto";

const turnstileSiteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const turnstileRequestTimeoutMs = 3500;

export type TurnstileValidationResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "missing_token" | "failed" | "unavailable" };

type TurnstileSiteverifyResponse = {
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
  hostname?: string;
  success?: boolean;
};

type ValidateTurnstileParams = {
  action: string;
  clientIp: string;
  context: string;
  requestHost: string | null;
  token: string | undefined;
};

export const isHostedRuntime = (): boolean =>
  process.env.VERCEL === "1" || process.env.REQUIRE_CONTACT_TURNSTILE === "1";

export const readOptionalServerEnv = (name: string): string | null => {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value;
};

const readTurnstileSecret = (context: string): string | null => {
  const secret = readOptionalServerEnv("TURNSTILE_SECRET_KEY");

  if (secret !== null) {
    return secret;
  }

  if (isHostedRuntime()) {
    throw new Error(`TURNSTILE_SECRET_KEY is required for hosted ${context}.`);
  }

  return null;
};

export const validateTurnstileTokenAsync = async ({
  action,
  clientIp,
  context,
  requestHost,
  token,
}: ValidateTurnstileParams): Promise<TurnstileValidationResult> => {
  const secret = readTurnstileSecret(context);

  if (secret === null) {
    return { ok: true };
  }

  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", clientIp);
  body.set("idempotency_key", randomUUID());

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), turnstileRequestTimeoutMs);

  try {
    const response = await fetch(turnstileSiteverifyUrl, {
      body,
      method: "POST",
      signal: abortController.signal,
    });
    const result = (await response.json()) as TurnstileSiteverifyResponse;

    if (!response.ok || result.success !== true) {
      console.warn("[turnstile] validation failed", {
        context,
        errors: result["error-codes"] ?? [],
      });

      return { ok: false, reason: "failed" };
    }

    const expectedHostname = requestHost === null ? null : requestHost.split(":")[0];
    const hostnameMatches =
      expectedHostname === null ||
      typeof result.hostname !== "string" ||
      result.hostname === expectedHostname;
    const actionMatches = typeof result.action !== "string" || result.action === action;

    if (!hostnameMatches || !actionMatches) {
      console.warn("[turnstile] context mismatch", {
        action: result.action ?? null,
        context,
        hostname: result.hostname ?? null,
      });

      return { ok: false, reason: "failed" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[turnstile] validation unavailable", {
      context,
      message: error instanceof Error ? error.message : "Unknown Turnstile validation error.",
    });

    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
};
