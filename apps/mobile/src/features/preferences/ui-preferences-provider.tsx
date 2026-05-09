import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { StyleSheet } from "react-native";

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
import { deviceStorage } from "@/lib/device-storage";

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
  const defaultLanguage = detectPreferredLanguage(getDeviceLocale());
  const [themeMode] = useState<MobileThemeMode>("dark");
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    let isActive = true;

    const loadPreferencesAsync = async (): Promise<void> => {
      const storedLanguage = await deviceStorage.getItemAsync(LANGUAGE_KEY);

      if (!isActive) {
        return;
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

  const setThemeMode = async (_mode: MobileThemeMode): Promise<void> => {
    // Dark mode is fixed; this is kept for API compatibility.
  };

  const setLanguage = async (nextLanguage: AppLanguage): Promise<void> => {
    setLanguageState(nextLanguage);
    await deviceStorage.setItemAsync(LANGUAGE_KEY, nextLanguage);
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
