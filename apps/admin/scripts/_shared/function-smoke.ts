import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");
process.loadEnvFile?.("../../supabase/.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dockerBinary = process.env.DOCKER_BINARY ?? "/usr/local/bin/docker";
const functionBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL ?? "http://127.0.0.1:54321/functions/v1";
const localDatabaseContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_omaleima";
const qrSigningSecret = process.env.QR_SIGNING_SECRET;
const scheduledJobSecret = process.env.SCHEDULED_JOB_SECRET;

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for function smoke scripts.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for function smoke scripts.");
}

export type AuthedClient = {
  email: string;
  supabase: ReturnType<typeof createStatelessClient>;
};

export type FunctionJsonResponse = {
  details?: Record<string, unknown>;
  expiresAt?: string;
  message?: string;
  qrPayload?: {
    token: string;
    type?: string;
    v?: number;
  };
  refreshAfterSeconds?: number;
  stampCount?: number;
  stampId?: string;
  status?: string;
};

export const seededAdminEmail = "admin@omaleima.test";
export const seededOrganizerEmail = "organizer@omaleima.test";
export const seededScannerEmail = "scanner@omaleima.test";
export const seededStudentEmail = "student@omaleima.test";
export const seededPassword = "password123";

export const seededAdminProfileId = "00000000-0000-0000-0000-000000000001";
export const seededOrganizerProfileId = "00000000-0000-0000-0000-000000000002";
export const seededScannerProfileId = "00000000-0000-0000-0000-000000000003";
export const seededStudentProfileId = "00000000-0000-0000-0000-000000000004";
export const seededClubId = "10000000-0000-0000-0000-000000000001";
export const seededBusinessId = "20000000-0000-0000-0000-000000000001";
export const seededActiveEventId = "30000000-0000-0000-0000-000000000001";

export const createStatelessClient = () =>
  createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

export const createAuthedClientAsync = async (email: string, password: string): Promise<AuthedClient> => {
  const supabase = createStatelessClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in ${email} for function smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
  };
};

export const getAccessTokenAsync = async (client: AuthedClient): Promise<string> => {
  const sessionResult = await client.supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(`Missing access token for ${client.email} during function smoke.`);
  }

  return accessToken;
};

export const invokeFunctionAsync = async (
  functionName: string,
  accessToken: string | null,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ responseBody: FunctionJsonResponse; status: number }> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: publishableKey,
  };

  if (typeof accessToken === "string") {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${functionBaseUrl}/${functionName}`, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
    signal,
  });
  const responseBody = (await response.json()) as FunctionJsonResponse;

  return {
    responseBody,
    status: response.status,
  };
};

export const requireScheduledJobSecret = (): string => {
  if (typeof scheduledJobSecret !== "string" || scheduledJobSecret.length === 0) {
    throw new Error("Missing SCHEDULED_JOB_SECRET for function smoke scripts.");
  }

  return scheduledJobSecret;
};

export const invokeScheduledFunctionAsync = async (
  functionName: string,
  scheduledSecret: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ responseBody: FunctionJsonResponse; status: number }> => {
  const response = await fetch(`${functionBaseUrl}/${functionName}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      "x-scheduled-job-secret": scheduledSecret,
    },
    method: "POST",
    signal,
  });
  const responseBody = (await response.json()) as FunctionJsonResponse;

  return {
    responseBody,
    status: response.status,
  };
};

export const runSqlAsync = async (sql: string): Promise<void> => {
  execFileSync(
    dockerBinary,
    [
      "exec",
      localDatabaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      stdio: "pipe",
    }
  );
};

export const readSqlTextAsync = async (sql: string): Promise<string> => {
  const output = execFileSync(
    dockerBinary,
    [
      "exec",
      localDatabaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-c",
      sql,
    ],
    {
      stdio: "pipe",
    }
  );

  return output.toString("utf8").trim();
};

export const requireQrSigningSecret = (): string => {
  if (typeof qrSigningSecret !== "string" || qrSigningSecret.length === 0) {
    throw new Error("Missing QR_SIGNING_SECRET for function smoke scripts.");
  }

  return qrSigningSecret;
};
