import { spawnSync } from "node:child_process";

import { z } from "zod";

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

type HttpOperation = "GET" | "PATCH";
type RetryableHttpError = Error & {
  details: {
    body: string;
    method: HttpOperation;
    projectRef: string;
    status: number;
  };
  retryable: boolean;
};

let cachedResponseSequence: AuthConfig[] | null = null;

const retryDelayMilliseconds = 1000;
const retryAttempts = 3;

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

  throw new Error(
    `Missing ${environmentVariableName}. Pass the target Supabase project ref explicitly so hosted/production scripts cannot run against the wrong project.`
  );
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

const sleepAsync = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const shouldRetryStatus = (status: number): boolean => status === 429 || status >= 500;

const createHttpError = (
  method: HttpOperation,
  projectRef: string,
  status: number,
  body: string
): RetryableHttpError => {
  const error = new Error(
    `Could not ${method === "GET" ? "read" : "update"} Supabase auth config for project ${projectRef}. status=${status} body=${body}`
  ) as RetryableHttpError;

  error.details = {
    body,
    method,
    projectRef,
    status,
  };
  error.retryable = shouldRetryStatus(status);

  return error;
};

const logRetryWarning = (attempt: number, error: RetryableHttpError): void => {
  console.warn(
    JSON.stringify({
      attempt,
      body: error.details.body,
      level: "warn",
      method: error.details.method,
      operation: "supabase-auth-config",
      projectRef: error.details.projectRef,
      retryable: error.retryable,
      status: error.details.status,
    })
  );
};

const runWithRetriesAsync = async <T>(
  operation: (attempt: number) => Promise<T>,
  attempts: number
): Promise<T> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (!(error instanceof Error) || !("retryable" in error) || error.retryable !== true || attempt === attempts) {
        throw error;
      }

      logRetryWarning(attempt, error as RetryableHttpError);
      await sleepAsync(retryDelayMilliseconds);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Supabase auth config operation failed without a retryable error.");
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

  return runWithRetriesAsync(async () => {
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

      throw createHttpError("GET", projectRef, response.status, responseBody);
    }

    return authConfigSchema.parse(await response.json());
  }, retryAttempts);
};

export const patchAuthConfig = async (projectRef: string, patch: AuthConfigPatch): Promise<void> => {
  const patchResponseOverride = process.env.SUPABASE_AUTH_CONFIG_PATCH_RESPONSE_JSON;
  const expectedPatchOverride = process.env.SUPABASE_AUTH_CONFIG_EXPECTED_PATCH_JSON;

  if (typeof expectedPatchOverride === "string" && expectedPatchOverride.trim().length > 0) {
    const expectedPatch = authConfigPatchSchema.parse(JSON.parse(expectedPatchOverride) as unknown);

    if (JSON.stringify(expectedPatch) !== JSON.stringify(patch)) {
      throw new Error(
        `Supabase auth patch did not match expected payload. expected=${JSON.stringify(expectedPatch)} actual=${JSON.stringify(patch)}`
      );
    }
  }

  if (typeof patchResponseOverride === "string" && patchResponseOverride.trim().length > 0) {
    JSON.parse(patchResponseOverride);
    return;
  }

  await runWithRetriesAsync(async () => {
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

      throw createHttpError("PATCH", projectRef, response.status, responseBody);
    }
  }, retryAttempts);
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

export const buildManagedAuthConfigPatch = (target: AuthConfigTarget, currentAuthConfig: AuthConfig): AuthConfigPatch => {
  const currentRedirectUrls = readRedirectUrls(currentAuthConfig);
  const managedRedirectUrls = currentRedirectUrls.filter((redirectUrl, index) => currentRedirectUrls.indexOf(redirectUrl) === index);

  requiredRedirectUrls.forEach((requiredRedirectUrl) => {
    if (!managedRedirectUrls.includes(requiredRedirectUrl)) {
      managedRedirectUrls.push(requiredRedirectUrl);
    }
  });

  return authConfigPatchSchema.parse({
    site_url: targetToSiteUrl(target),
    uri_allow_list: managedRedirectUrls.join(","),
  });
};

export const assertTargetStateReachedAsync = async (
  projectRef: string,
  targetState: SiteUrlState
): Promise<AuthConfig> =>
  runWithRetriesAsync(async (attempt) => {
    const authConfig = await fetchAuthConfig(projectRef);
    const currentState = resolveSiteUrlState(authConfig.site_url);

    if (currentState !== targetState) {
      const error = new Error(
        `Supabase auth config write completed but final state is ${currentState}, expected ${targetState}.`
      ) as RetryableHttpError;

      error.details = {
        body: authConfig.site_url,
        method: "GET",
        projectRef,
        status: 503,
      };
      error.retryable = attempt < retryAttempts;

      throw error;
    }

    return authConfig;
  }, retryAttempts);

export const buildCanonicalAuthConfigPatch = (target: AuthConfigTarget): AuthConfigPatch =>
  authConfigPatchSchema.parse({
    site_url: targetToSiteUrl(target),
    uri_allow_list: requiredRedirectUrls.join(","),
  });
