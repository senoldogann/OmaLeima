import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

import {
  darkMobileTheme,
  getMobileTheme,
  type MobileTheme,
  type MobileThemeMode,
} from "@/features/foundation/theme";
import {
  detectPreferredLanguage,
  getLocaleTag,
  mobileTranslations,
  type AppLanguage,
  type MobileCopy,
} from "@/features/i18n/translations";

const THEME_MODE_KEY = "ui-theme-mode";
const LANGUAGE_KEY = "ui-language";

type UiPreferencesContextValue = {
  theme: MobileTheme;
  themeMode: MobileThemeMode;
  language: AppLanguage;
  localeTag: string;
  copy: MobileCopy;
  setThemeMode: (mode: MobileThemeMode) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

const getDeviceLocale = (): string => Intl.DateTimeFormat().resolvedOptions().locale;

export const UiPreferencesProvider = ({ children }: PropsWithChildren) => {
  const systemColorScheme = useColorScheme();
  const defaultThemeMode: MobileThemeMode = systemColorScheme === "light" ? "light" : "dark";
  const defaultLanguage = detectPreferredLanguage(getDeviceLocale());
  const [themeMode, setThemeModeState] = useState<MobileThemeMode>(defaultThemeMode);
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    let isActive = true;

    const loadPreferencesAsync = async (): Promise<void> => {
      const [storedThemeMode, storedLanguage] = await Promise.all([
        SecureStore.getItemAsync(THEME_MODE_KEY),
        SecureStore.getItemAsync(LANGUAGE_KEY),
      ]);

      if (!isActive) {
        return;
      }

      if (storedThemeMode === "light" || storedThemeMode === "dark") {
        setThemeModeState(storedThemeMode);
      }

      if (storedLanguage === "fi" || storedLanguage === "en") {
        setLanguageState(storedLanguage);
      }
    };

    void loadPreferencesAsync();

    return () => {
      isActive = false;
    };
  }, []);

  const setThemeMode = async (mode: MobileThemeMode): Promise<void> => {
    setThemeModeState(mode);
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  };

  const setLanguage = async (nextLanguage: AppLanguage): Promise<void> => {
    setLanguageState(nextLanguage);
    await SecureStore.setItemAsync(LANGUAGE_KEY, nextLanguage);
  };

  const value = useMemo<UiPreferencesContextValue>(
    () => ({
      theme: getMobileTheme(themeMode),
      themeMode,
      language,
      localeTag: getLocaleTag(language),
      copy: mobileTranslations[language],
      setThemeMode,
      setLanguage,
    }),
    [language, themeMode]
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
};

export const useUiPreferences = (): UiPreferencesContextValue => {
  const context = useContext(UiPreferencesContext);

  if (context === null) {
    throw new Error("useUiPreferences must be used inside UiPreferencesProvider.");
  }

  return context;
};

export const useAppTheme = (): MobileTheme => useUiPreferences().theme;

export const useThemeStyles = <T extends ReturnType<typeof StyleSheet.create>>(
  factory: (theme: MobileTheme) => T
): T => {
  const theme = useAppTheme();

  return useMemo(() => factory(theme), [factory, theme]);
};

// Legacy escape hatch for files that still import a theme object during this migration slice.
export const fallbackTheme = darkMobileTheme;
