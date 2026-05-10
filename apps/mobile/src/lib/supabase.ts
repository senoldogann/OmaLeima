import "react-native-url-polyfill/auto";
import "@/lib/native-crypto-polyfill";

import { createClient } from "@supabase/supabase-js";

import { createSupabaseStorage } from "@/lib/device-storage";
import { publicEnv } from "@/lib/env";

const createSupabaseClient = () =>
  createClient(
    publicEnv.EXPO_PUBLIC_SUPABASE_URL,
    publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storage: createSupabaseStorage(),
      },
    }
  );

export const supabase = createSupabaseClient();
