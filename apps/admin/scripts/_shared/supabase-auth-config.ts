import { spawnSync } from "node:child_process";

import { z } from "zod";

export const defaultProjectRef = "jwhdlcnfhrwdxptmoret";
export const previewSiteUrl = "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app";
export const customDomainSiteUrl = "https://admin.omaleima.fi";

export const requiredRedirectUrls = [
  "http://localhost:3001/auth/callback",
  "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/auth/callback",
  "https://admin.omaleima.fi/auth/callback",
  "omaleima://auth/callback",
  "http://localhost:8081/auth/callback",
  "https://*-senol-dogans-projects.vercel.app/**",
] as const;

export const authConfigSchema = z.object({
  external_google_client_id: z.string().nullable(),
  external_google_enabled: z.boolean(),
  site_url: z.string().url(),
  uri_allow_list: z.string(),
});

export const authConfigPatchSchema = z.object({
  site_url: z.string().url(),
  uri_allow_list: z.string(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
export type AuthConfigPatch = z.infer<typeof authConfigPatchSchema>;
export type SiteUrlState = "preview-site-url" | "custom-domain-site-url";
export type AuthConfigTarget = "preview" | "custom-domain";

let cachedResponseSequence: AuthConfig[] | null = null;

export const parseCsvValues = (rawValue: string): string[] =>
  rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

export const readProjectRef = (environmentVariableName: string): string => {
  const overrideProjectRef = process.env[environmentVariableName];

  if (typeof overrideProjectRef === "string" && overrideProjectRef.trim().length > 0) {
    return overrideProjectRef.trim();
  }

  return defaultProjectRef;
};

export const readSupabaseAccessToken = (): string => {
  const overrideAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (typeof overrideAccessToken === "string" && overrideAccessToken.trim().length > 0) {
    return overrideAccessToken.trim();
  }

  const securityResult = spawnSync("security", ["find-generic-password", "-a", "supabase", "-g"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (securityResult.status !== 0) {
    const errorOutput = `${securityResult.stdout}${securityResult.stderr}`.trim();

    throw new Error(
      `Could not read Supabase access token from macOS keychain. Set SUPABASE_ACCESS_TOKEN explicitly or run "supabase login" first. ${errorOutput}`
    );
  }

  const keychainOutput = `${securityResult.stdout}${securityResult.stderr}`;
  const encodedTokenMatch = keychainOutput.match(/password:\s+"go-keyring-base64:([^"]+)"/u);

  if (encodedTokenMatch?.[1] === undefined) {
    throw new Error(
      'Could not parse Supabase access token from macOS keychain. Set SUPABASE_ACCESS_TOKEN explicitly or rerun "supabase login".'
    );
  }

  return Buffer.from(encodedTokenMatch[1], "base64").toString("utf8");
};

const readSequenceOverrideAuthConfig = (): AuthConfig | null => {
  const sequenceResponse = process.env.SUPABASE_AUTH_CONFIG_RESPONSE_SEQUENCE_JSON;

  if (typeof sequenceResponse !== "string" || sequenceResponse.trim().length === 0) {
    return null;
  }

  if (cachedResponseSequence === null) {
    const parsedSequence = z.array(authConfigSchema).parse(JSON.parse(sequenceResponse) as unknown);
    cachedResponseSequence = [...parsedSequence];
  }

  const nextResponse = cachedResponseSequence.shift();

  if (nextResponse === undefined) {
    throw new Error("SUPABASE_AUTH_CONFIG_RESPONSE_SEQUENCE_JSON did not contain enough auth config entries.");
  }

  return nextResponse;
};

const readSingleOverrideAuthConfig = (): AuthConfig | null => {
  const overrideResponse = process.env.SUPABASE_AUTH_CONFIG_RESPONSE_JSON;

  if (typeof overrideResponse !== "string" || overrideResponse.trim().length === 0) {
    return null;
  }

  return authConfigSchema.parse(JSON.parse(overrideResponse) as unknown);
};

const readOverrideAuthConfig = (): AuthConfig | null => {
  const sequenceOverride = readSequenceOverrideAuthConfig();

  if (sequenceOverride !== null) {
    return sequenceOverride;
  }

  return readSingleOverrideAuthConfig();
};

export const fetchAuthConfig = async (projectRef: string): Promise<AuthConfig> => {
  const overrideAuthConfig = readOverrideAuthConfig();

  if (overrideAuthConfig !== null) {
    return overrideAuthConfig;
  }

  const accessToken = readSupabaseAccessToken();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "GET",
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Could not read Supabase auth config for project ${projectRef}. status=${response.status} body=${responseBody}`
    );
  }

  return authConfigSchema.parse(await response.json());
};

export const patchAuthConfig = async (projectRef: string, patch: AuthConfigPatch): Promise<void> => {
  const patchResponseOverride = process.env.SUPABASE_AUTH_CONFIG_PATCH_RESPONSE_JSON;

  if (typeof patchResponseOverride === "string" && patchResponseOverride.trim().length > 0) {
    JSON.parse(patchResponseOverride);
    return;
  }

  const accessToken = readSupabaseAccessToken();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    body: JSON.stringify(patch),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Could not update Supabase auth config for project ${projectRef}. status=${response.status} body=${responseBody}`
    );
  }
};

export const resolveSiteUrlState = (siteUrl: string): SiteUrlState => {
  if (siteUrl === previewSiteUrl) {
    return "preview-site-url";
  }

  if (siteUrl === customDomainSiteUrl) {
    return "custom-domain-site-url";
  }

  throw new Error(
    `Unexpected Supabase auth site_url: ${siteUrl}. Expected either ${previewSiteUrl} or ${customDomainSiteUrl}.`
  );
};

export const readRedirectUrls = (authConfig: AuthConfig): string[] => parseCsvValues(authConfig.uri_allow_list);

export const assertRequiredRedirectUrls = (authConfig: AuthConfig): string[] => {
  const redirectUrls = readRedirectUrls(authConfig);
  const missingRedirectUrls = requiredRedirectUrls.filter((requiredRedirectUrl) =>
    !redirectUrls.includes(requiredRedirectUrl)
  );

  if (missingRedirectUrls.length > 0) {
    throw new Error(
      `Missing required Supabase auth redirect URLs: ${missingRedirectUrls.join(", ")}. Current list: ${redirectUrls.join(", ")}`
    );
  }

  return redirectUrls;
};

export const assertGoogleOAuthState = (authConfig: AuthConfig): void => {
  if (!authConfig.external_google_enabled) {
    throw new Error("Google auth must stay enabled in hosted Supabase auth config.");
  }

  if (typeof authConfig.external_google_client_id !== "string" || authConfig.external_google_client_id.length === 0) {
    throw new Error("Google auth is enabled but external_google_client_id is missing.");
  }
};

export const targetToState = (target: AuthConfigTarget): SiteUrlState =>
  target === "preview" ? "preview-site-url" : "custom-domain-site-url";

export const targetToSiteUrl = (target: AuthConfigTarget): string =>
  target === "preview" ? previewSiteUrl : customDomainSiteUrl;

export const buildCanonicalAuthConfigPatch = (target: AuthConfigTarget): AuthConfigPatch =>
  authConfigPatchSchema.parse({
    site_url: targetToSiteUrl(target),
    uri_allow_list: requiredRedirectUrls.join(","),
  });
