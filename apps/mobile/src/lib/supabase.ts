import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

const isStorageAvailable = (): boolean => typeof globalThis.localStorage !== "undefined";

const createSupabaseClient = () =>
  createClient(
    publicEnv.EXPO_PUBLIC_SUPABASE_URL,
    publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    isStorageAvailable()
      ? {
          auth: {
            storage: globalThis.localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        }
      : {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
  );

export const supabase = createSupabaseClient();
