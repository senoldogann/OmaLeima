export type RuntimeEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  qrSigningSecret: string;
};

const readRequiredEnv = (name: string): string => {
  const value = Deno.env.get(name);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const readRuntimeEnv = (): RuntimeEnv => ({
  supabaseUrl: readRequiredEnv("SUPABASE_URL"),
  serviceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  qrSigningSecret: readRequiredEnv("QR_SIGNING_SECRET"),
});
