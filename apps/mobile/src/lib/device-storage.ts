import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type DeviceStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export type SupabaseStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const isBrowserStorageAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const browserStorage: DeviceStorage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (!isBrowserStorageAvailable()) {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (!isBrowserStorageAvailable()) {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (!isBrowserStorageAvailable()) {
      return;
    }

    window.localStorage.removeItem(key);
  },
};

const nativeStorage: DeviceStorage = {
  getItemAsync: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const deviceStorage: DeviceStorage = Platform.OS === "web" ? browserStorage : nativeStorage;

export const createSupabaseStorage = (): SupabaseStorage => ({
  getItem: (key: string): Promise<string | null> => deviceStorage.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => deviceStorage.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => deviceStorage.deleteItemAsync(key),
});
