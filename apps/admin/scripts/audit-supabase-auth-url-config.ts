import { spawnSync } from "node:child_process";

import { z } from "zod";

const defaultProjectRef = "jwhdlcnfhrwdxptmoret";
const previewSiteUrl = "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app";
const customDomainSiteUrl = "https://admin.omaleima.fi";

const requiredRedirectUrls = [
  "http://localhost:3001/auth/callback",
  "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/auth/callback",
  "https://admin.omaleima.fi/auth/callback",
  "omaleima://auth/callback",
  "http://localhost:8081/auth/callback",
  "https://*-senol-dogans-projects.vercel.app/**",
] as const;

const authConfigSchema = z.object({
  external_google_client_id: z.string().nullable(),
  external_google_enabled: z.boolean(),
  site_url: z.string().url(),
  uri_allow_list: z.string(),
});

type AuthConfig = z.infer<typeof authConfigSchema>;
type SiteUrlState = "preview-site-url" | "custom-domain-site-url";

const parseCsvValues = (rawValue: string): string[] =>
  rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const readProjectRef = (): string => {
  const overrideProjectRef = process.env.SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF;

  if (typeof overrideProjectRef === "string" && overrideProjectRef.trim().length > 0) {
    return overrideProjectRef.trim();
  }

  return defaultProjectRef;
};

const readSupabaseAccessToken = (): string => {
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

const readOverrideAuthConfig = (): AuthConfig | null => {
  const overrideResponse = process.env.SUPABASE_AUTH_CONFIG_AUDIT_RESPONSE_JSON;

  if (typeof overrideResponse !== "string" || overrideResponse.trim().length === 0) {
    return null;
  }

  return authConfigSchema.parse(JSON.parse(overrideResponse) as unknown);
};

const fetchAuthConfig = async (projectRef: string): Promise<AuthConfig> => {
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

const resolveSiteUrlState = (siteUrl: string): SiteUrlState => {
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

const assertRequiredRedirectUrls = (authConfig: AuthConfig): string[] => {
  const redirectUrls = parseCsvValues(authConfig.uri_allow_list);
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

const assertGoogleOAuthState = (authConfig: AuthConfig): void => {
  if (!authConfig.external_google_enabled) {
    throw new Error("Google auth must stay enabled in hosted Supabase auth config.");
  }

  if (typeof authConfig.external_google_client_id !== "string" || authConfig.external_google_client_id.length === 0) {
    throw new Error("Google auth is enabled but external_google_client_id is missing.");
  }
};

const readNextStep = (siteUrlState: SiteUrlState): string => {
  if (siteUrlState === "preview-site-url") {
    return "switch-site-url-to-custom-domain-when-dns-is-ready";
  }

  return "rerun-hosted-smoke-on-custom-domain";
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef();
  const authConfig = await fetchAuthConfig(projectRef);
  const siteUrlState = resolveSiteUrlState(authConfig.site_url);
  const redirectUrls = assertRequiredRedirectUrls(authConfig);

  assertGoogleOAuthState(authConfig);

  console.log(
    [
      "supabase-auth-url-config:READY",
      `project:${projectRef}`,
      `state:${siteUrlState}`,
      `site-url:${authConfig.site_url}`,
      `redirect-count:${redirectUrls.length}`,
      "google:enabled",
      `next:${readNextStep(siteUrlState)}`,
    ].join("|")
  );
};

void run();
