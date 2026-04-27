import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import type { RuntimeEnv } from "./env.ts";

export type AuthenticatedUser = {
  user: User;
  token: string;
};

export type AuthenticatedUserResult =
  | {
      ok: true;
      value: AuthenticatedUser;
    }
  | {
      ok: false;
      message: string;
    };

export const createServiceClient = (env: RuntimeEnv): SupabaseClient =>
  createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

export const getAuthenticatedUser = async (
  supabase: SupabaseClient,
  token: string,
): Promise<AuthenticatedUserResult> => {
  const { data, error } = await supabase.auth.getUser(token);

  if (error !== null || data.user === null) {
    return {
      ok: false,
      message: error?.message ?? "user not found",
    };
  }

  return {
    ok: true,
    value: {
      user: data.user,
      token,
    },
  };
};
