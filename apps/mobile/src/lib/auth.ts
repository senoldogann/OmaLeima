import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

if (typeof window !== "undefined") {
  void WebBrowser.maybeCompleteAuthSession();
}

export const createGoogleRedirectUri = (): string =>
  makeRedirectUri({
    scheme: "omaleima",
    path: "auth/callback",
  });

const openWebOAuthAsync = (url: string): void => {
  window.location.assign(url);
};

export const signInWithGoogleAsync = async (): Promise<void> => {
  const redirectTo = createGoogleRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      skipBrowserRedirect: true,
    },
  });

  if (error !== null) {
    throw new Error(error.message);
  }

  if (typeof data.url !== "string" || data.url.length === 0) {
    throw new Error("Supabase did not return an OAuth URL.");
  }

  if (Platform.OS === "web") {
    openWebOAuthAsync(data.url);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "cancel") {
    throw new Error("Google sign-in was cancelled.");
  }

  if (result.type === "dismiss") {
    throw new Error("Google sign-in was dismissed before completion.");
  }
};
