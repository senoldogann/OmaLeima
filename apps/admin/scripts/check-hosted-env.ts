import { existsSync } from "node:fs";

import { z } from "zod";

const localEnvCandidates = [
  ".env.local",
  "apps/admin/.env.local",
];

for (const localEnvCandidate of localEnvCandidates) {
  if (existsSync(localEnvCandidate)) {
    process.loadEnvFile?.(localEnvCandidate);
    break;
  }
}

type HostedEnvCheckResult = {
  host: string;
  mode: "hosted-required" | "local-safe";
  targetEnv: string;
};

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."),
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
});

const placeholderMarkers = [
  "replace_me",
  "your_local_or_hosted_key",
];

const parsePublicEnvAsync = async (): Promise<z.infer<typeof publicEnvSchema>> =>
  publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

const readHostedModeAsync = async (): Promise<boolean> => {
  const vercelValue = process.env.VERCEL;
  const requireHostedEnvValue = process.env.REQUIRE_HOSTED_ADMIN_ENV;

  return (
    vercelValue === "1" ||
    requireHostedEnvValue === "1" ||
    requireHostedEnvValue === "true"
  );
};

const isLoopbackHost = (host: string): boolean => {
  const normalizedHost = host.toLowerCase();

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.endsWith(".localhost")
  );
};

const isPlaceholderPublishableKey = (publishableKey: string): boolean =>
  placeholderMarkers.some((marker) => publishableKey.includes(marker));

const validateHostedEnvAsync = async (): Promise<HostedEnvCheckResult> => {
  const hostedMode = await readHostedModeAsync();
  const publicEnv = await parsePublicEnvAsync();
  const supabaseUrl = new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL);
  const targetEnv = process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV ?? "development";

  if (hostedMode) {
    if (supabaseUrl.protocol !== "https:") {
      throw new Error(
        `Hosted admin env requires NEXT_PUBLIC_SUPABASE_URL to use https, got ${publicEnv.NEXT_PUBLIC_SUPABASE_URL}.`
      );
    }

    if (isLoopbackHost(supabaseUrl.hostname)) {
      throw new Error(
        `Hosted admin env requires NEXT_PUBLIC_SUPABASE_URL to point at hosted Supabase, got ${publicEnv.NEXT_PUBLIC_SUPABASE_URL}.`
      );
    }

    if (isPlaceholderPublishableKey(publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
      throw new Error("Hosted admin env requires a real NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, not an example placeholder.");
    }
  }

  return {
    host: supabaseUrl.host,
    mode: hostedMode ? "hosted-required" : "local-safe",
    targetEnv,
  };
};

const run = async (): Promise<void> => {
  const result = await validateHostedEnvAsync();

  console.log(`admin-hosted-env:${result.mode}|target:${result.targetEnv}|supabase-host:${result.host}`);
};

void run();
