import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { AppleSignInButton } from "@/features/auth/components/apple-sign-in-button";
import { BusinessPasswordSignIn } from "@/features/auth/components/business-password-sign-in";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { LoginHero } from "@/features/auth/components/login-hero";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { MobileConsentCard } from "@/features/legal/mobile-consent-card";
import { readMobileLegalConsentAsync } from "@/features/legal/mobile-consent";
import { LanguageDropdown } from "@/features/preferences/language-dropdown";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useIsScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { useSession } from "@/providers/session-provider";

type LoginMode = "student" | "business";

export default function LoginScreen() {
  const theme = useAppTheme();
  const { copy, language, setLanguage } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { isAuthenticated, isLoading, session } = useSession();
  const isScannerProvisioningActive = useIsScannerProvisioningActive();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null && !isScannerProvisioningActive,
  });
  const [mode, setMode] = useState<LoginMode>("student");
  const [isLegalConsentAccepted, setIsLegalConsentAccepted] = useState<boolean>(false);
  const [isLegalConsentLoading, setIsLegalConsentLoading] = useState<boolean>(true);
  const [legalConsentError, setLegalConsentError] = useState<string | null>(null);
  const isResolvingAccess = !isLoading && isAuthenticated && !isScannerProvisioningActive && accessQuery.isLoading;

  useEffect(() => {
    let isActive = true;

    const loadLegalConsentAsync = async (): Promise<void> => {
      try {
        const storedConsent = await readMobileLegalConsentAsync();

        if (!isActive) {
          return;
        }

        setIsLegalConsentAccepted(storedConsent !== null);
        setLegalConsentError(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setIsLegalConsentAccepted(false);
        setLegalConsentError(createUserSafeErrorMessage(error, language, "legalConsent"));
      } finally {
        if (isActive) {
          setIsLegalConsentLoading(false);
        }
      }
    };

    void loadLegalConsentAsync();

    return () => {
      isActive = false;
    };
  }, [language]);

  if (!isScannerProvisioningActive && !isLoading && isAuthenticated && accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
    return <Redirect href={accessQuery.data.homeHref} />;
  }

  if (isLoading || isResolvingAccess || isLegalConsentLoading) {
    return (
      <AppScreen>
        <LoginHero />
        <AuthLoadingPanel
          message={copy.auth.openingMessage}
          title={copy.auth.opening}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <LoginHero />

      <View style={styles.card}>
        <View style={styles.cardHandle} />

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {mode === "student" ? copy.auth.studentSignIn : copy.auth.businessSignIn}
          </Text>
          <Text style={styles.cardSubtitle}>
            {mode === "student" ? copy.auth.studentHelper : copy.auth.businessHelper}
          </Text>
        </View>

        <LanguageDropdown language={language} onLanguageChange={setLanguage} />

        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => {
              setMode("student");
            }}
            style={({ pressed }) => [
              styles.modeButton,
              mode === "student" ? styles.modeButtonActive : null,
              pressed ? styles.modeButtonPressed : null,
            ]}
          >
            <AppIcon color={mode === "student" ? theme.colors.screenBase : theme.colors.textPrimary} name="google" size={18} />
            <Text style={[styles.modeButtonText, mode === "student" ? styles.modeButtonTextActive : null]}>
              {copy.common.student}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode("business");
            }}
            style={({ pressed }) => [
              styles.modeButton,
              mode === "business" ? styles.modeButtonActive : null,
              pressed ? styles.modeButtonPressed : null,
            ]}
          >
            <AppIcon color={mode === "business" ? theme.colors.screenBase : theme.colors.textPrimary} name="business" size={18} />
            <Text style={[styles.modeButtonText, mode === "business" ? styles.modeButtonTextActive : null]}>
              {copy.common.business}
            </Text>
          </Pressable>
        </View>

        {legalConsentError !== null ? <Text style={styles.errorText}>{legalConsentError}</Text> : null}
        {isLegalConsentAccepted ? (
          mode === "student" ? (
            <View style={styles.studentAuthActions}>
              <GoogleSignInButton />
              <AppleSignInButton />
            </View>
          ) : <BusinessPasswordSignIn />
        ) : null}
      </View>

      {!isLegalConsentAccepted ? (
        <MobileConsentCard
          language={language}
          onAccepted={() => {
            setIsLegalConsentAccepted(true);
            setLegalConsentError(null);
          }}
        />
      ) : null}

    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 24,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      padding: 22,
    },
    cardHandle: {
      alignSelf: "center",
      backgroundColor: theme.colors.borderDefault,
      borderRadius: 2,
      height: 4,
      marginBottom: 4,
      width: 36,
    },
    cardHeader: {
      gap: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      letterSpacing: -0.4,
      lineHeight: theme.typography.lineHeights.title,
    },
    cardSubtitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    modeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.card,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    modeButtonActive: {
      backgroundColor: theme.colors.lime,
    },
    modeButtonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    modeButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    modeButtonTextActive: {
      color: theme.colors.actionPrimaryText,
    },
    modeSelector: {
      flexDirection: "row",
      gap: 10,
    },
    studentAuthActions: {
      gap: 10,
    },
  });
