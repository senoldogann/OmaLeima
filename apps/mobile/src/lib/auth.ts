import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

const nativeGoogleRedirectUri = "omaleima://auth/callback";

if (typeof window !== "undefined") {
  void WebBrowser.maybeCompleteAuthSession();
}

export const createGoogleRedirectUri = (): string =>
  makeRedirectUri({
    native: nativeGoogleRedirectUri,
    scheme: "omaleima",
    path: "auth/callback",
  });

const openWebOAuthAsync = (url: string): void => {
  window.location.assign(url);
};

const readCallbackParam = (url: string, key: string): string | null => {
  const { params } = QueryParams.getQueryParams(url);
  const value = params[key];

  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
};

const completeNativeOAuthCallbackAsync = async (callbackUrl: string): Promise<void> => {
  const callbackError = readCallbackParam(callbackUrl, "error");
  const callbackErrorDescription = readCallbackParam(callbackUrl, "error_description");

  if (callbackError !== null) {
    throw new Error(callbackErrorDescription ?? callbackError);
  }

  const accessToken = readCallbackParam(callbackUrl, "access_token");
  const refreshToken = readCallbackParam(callbackUrl, "refresh_token");

  if (accessToken !== null || refreshToken !== null) {
    throw new Error("OAuth callback must return an authorization code.");
  }

  const code = readCallbackParam(callbackUrl, "code");

  if (code === null) {
    throw new Error("OAuth callback returned without a session payload or authorization code.");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    throw new Error(error.message);
  }
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

  if (result.type !== "success") {
    throw new Error(`Google sign-in returned an unsupported auth result: ${result.type}`);
  }

  await completeNativeOAuthCallbackAsync(result.url);
};
