import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readOptionalServerEnv } from "@/features/security/turnstile";
import { publicEnv } from "@/lib/env";

const readRequiredServiceRoleKey = (context: string): string => {
  const serviceRoleKey = readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceRoleKey === null) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY is required for ${context}.`);
  }

  return serviceRoleKey;
};

export const createServiceRoleClient = (context: string): SupabaseClient =>
  createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, readRequiredServiceRoleKey(context), {
    auth: {
      persistSession: false,
    },
  });
