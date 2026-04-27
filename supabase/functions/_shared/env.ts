export type RuntimeEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  qrSigningSecret: string;
  expoPushApiUrl: string;
  expoPushAccessToken: string | null;
};

const readRequiredEnv = (name: string): string => {
  const value = Deno.env.get(name);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readOptionalEnv = (name: string): string | null => {
  const value = Deno.env.get(name);

  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
};

export const readRuntimeEnv = (): RuntimeEnv => ({
  supabaseUrl: readRequiredEnv("SUPABASE_URL"),
  serviceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  qrSigningSecret: readRequiredEnv("QR_SIGNING_SECRET"),
  expoPushApiUrl: Deno.env.get("EXPO_PUSH_API_URL") ?? "https://exp.host/--/api/v2/push/send",
  expoPushAccessToken: readOptionalEnv("EXPO_PUSH_ACCESS_TOKEN"),
});
