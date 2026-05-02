import type { SupabaseClient } from "@supabase/supabase-js";

const isMissingSessionError = (message: string): boolean =>
  message.toLowerCase().includes("auth session missing") ||
  message.toLowerCase().includes("session_not_found");

export const resolveAuthenticatedRouteUserIdAsync = async (
  supabase: SupabaseClient
): Promise<string | null> => {
  const userResult = await supabase.auth.getUser();

  if (userResult.error !== null) {
    if (isMissingSessionError(userResult.error.message)) {
      return null;
    }

    throw new Error(`Failed to resolve route user: ${userResult.error.message}`);
  }

  return userResult.data.user?.id ?? null;
};
