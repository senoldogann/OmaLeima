import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
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
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useIsScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { useSession } from "@/providers/session-provider";

type LoginMode = "student" | "business";

export default function LoginScreen() {
  const theme = useAppTheme();
  const { copy, language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { bootstrapError, isAuthenticated, isLoading, retryBootstrap, session } = useSession();
  const isScannerProvisioningActive = useIsScannerProvisioningActive();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null && !isScannerProvisioningActive,
  });
  const [mode, setMode] = useState<LoginMode>("student");
  const [isLegalConsentAccepted, setIsLegalConsentAccepted] = useState<boolean>(false);
  const [isLegalConsentLoading, setIsLegalConsentLoading] = useState<boolean>(true);
  const [legalConsentError, setLegalConsentError] = useState<string | null>(null);
  const [isBusinessQrScannerVisible, setIsBusinessQrScannerVisible] = useState<boolean>(false);
  const isResolvingAccess = !isLoading && isAuthenticated && !isScannerProvisioningActive && accessQuery.isLoading;
  const titleText =
    mode === "student"
      ? language === "fi" ? "Opiskelija" : "Student"
      : language === "fi" ? "Yritys" : "Business";
  const helperText =
    mode === "student"
      ? language === "fi" ? "Jatka tapahtumiin ja leimapassiin." : "Continue to events and your leima pass."
      : language === "fi" ? "Kirjaudu scanneriin ja hallintaan." : "Sign in to scanner and tools.";
  const isBusinessQrMode = mode === "business" && isBusinessQrScannerVisible;

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

  if (bootstrapError !== null) {
    return (
      <AppScreen>
        <LoginHero />
        <AccessIssueCard
          title={language === "fi" ? "Istuntoa ei voitu palauttaa" : "Session could not be restored"}
          detail={createUserSafeErrorMessage(new Error(bootstrapError), language, "access")}
          retryLabel={copy.common.retry}
          onRetry={retryBootstrap}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.screenContent}>
      <LoginHero />

      <View style={styles.authPanel}>
        <View style={styles.panelGlow} />
        {!isBusinessQrMode ? (
          <View style={styles.panelTopRow}>
            <View style={styles.panelTitleGroup}>
              <Text style={styles.panelEyebrow}>{copy.auth.continueEyebrow}</Text>
              <Text style={styles.cardTitle}>{titleText}</Text>
            </View>
          </View>
        ) : null}

        {!isBusinessQrMode ? <Text numberOfLines={2} style={styles.cardSubtitle}>{helperText}</Text> : null}

        {!isBusinessQrMode ? (
          <View style={styles.modeSelector}>
            <Pressable
              onPress={() => {
                setIsBusinessQrScannerVisible(false);
                setMode("student");
              }}
              style={({ pressed }) => [
                styles.modeButton,
                mode === "student" ? styles.modeButtonActive : null,
                pressed ? styles.modeButtonPressed : null,
              ]}
            >
              <AppIcon color={mode === "student" ? theme.colors.screenBase : theme.colors.textPrimary} name="id-card" size={18} />
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
        ) : null}

        <View style={styles.authActionStage}>
          {legalConsentError !== null ? <Text style={styles.errorText}>{legalConsentError}</Text> : null}
          {isLegalConsentAccepted ? (
            mode === "student" ? (
              <View style={styles.studentAuthActions}>
                <GoogleSignInButton />
                <AppleSignInButton />
              </View>
            ) : (
              <BusinessPasswordSignIn
                isQrScannerVisible={isBusinessQrScannerVisible}
                onQrScannerVisibilityChange={setIsBusinessQrScannerVisible}
              />
            )
          ) : null}
        </View>
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
    authActionStage: {
      gap: 12,
    },
    authPanel: {
      backgroundColor: theme.mode === "dark" ? "rgba(12, 17, 12, 0.92)" : "rgba(255, 255, 255, 0.94)",
      borderColor: theme.mode === "dark" ? "rgba(200, 255, 71, 0.18)" : theme.colors.borderDefault,
      borderRadius: 22,
      borderWidth: 1,
      gap: 16,
      overflow: "hidden",
      padding: 18,
    },
    cardSubtitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    modeButton: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: 999,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 11,
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
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      padding: 4,
    },
    panelEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    panelGlow: {
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 156,
      opacity: theme.mode === "dark" ? 0.4 : 0.72,
      position: "absolute",
      right: -92,
      top: -96,
      width: 156,
    },
    panelTitleGroup: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    panelTopRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    screenContent: {
      gap: 16,
    },
    studentAuthActions: {
      gap: 10,
    },
  });
