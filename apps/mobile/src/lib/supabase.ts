import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { publicEnv } from "@/lib/env";

type SupportedStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const isBrowserStorageAvailable = (): boolean => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const createBrowserStorage = (): SupportedStorage => ({
  getItem: async (key: string): Promise<string | null> => {
    if (!isBrowserStorageAvailable()) {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isBrowserStorageAvailable()) {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isBrowserStorageAvailable()) {
      return;
    }

    window.localStorage.removeItem(key);
  },
});

const createNativeStorage = (): SupportedStorage => ({
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
});

const storage: SupportedStorage = Platform.OS === "web" ? createBrowserStorage() : createNativeStorage();

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
        storage,
      },
    }
  );

export const supabase = createSupabaseClient();
