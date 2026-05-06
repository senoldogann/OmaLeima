import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { BusinessPasswordSignIn } from "@/features/auth/components/business-password-sign-in";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { LoginHero } from "@/features/auth/components/login-hero";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
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
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const isResolvingAccess = !isLoading && isAuthenticated && !isScannerProvisioningActive && accessQuery.isLoading;

  if (!isScannerProvisioningActive && !isLoading && isAuthenticated && accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
    return <Redirect href={accessQuery.data.homeHref} />;
  }

  if (isLoading || isResolvingAccess) {
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

      <InfoCard
        eyebrow={copy.auth.continueEyebrow}
        motionIndex={1}
        title={mode === "student" ? copy.auth.studentSignIn : copy.auth.businessSignIn}
      >
        <View style={styles.utilityRow}>
          <View style={styles.languageMenuWrap}>
            <Pressable
              onPress={() => setIsLanguageMenuOpen((currentState) => !currentState)}
              style={({ pressed }) => [styles.languageTrigger, pressed ? styles.languageTriggerPressed : null]}
            >
              <AppIcon color={theme.colors.textPrimary} name="globe" size={16} />
              <Text style={styles.languageTriggerText}>{language === "fi" ? "FI" : "EN"}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-down" size={14} />
            </Pressable>

            {isLanguageMenuOpen ? (
              <View style={styles.languageDropdown}>
                <Text style={styles.languageMenuTitle}>{copy.common.language}</Text>
                <Pressable
                  onPress={() => {
                    void setLanguage("fi");
                    setIsLanguageMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.languageMenuOption,
                    language === "fi" ? styles.languageMenuOptionActive : null,
                    pressed ? styles.languageMenuOptionPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageMenuOptionText,
                      language === "fi" ? styles.languageMenuOptionTextActive : null,
                    ]}
                  >
                    {copy.common.finnish}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void setLanguage("en");
                    setIsLanguageMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.languageMenuOption,
                    language === "en" ? styles.languageMenuOptionActive : null,
                    pressed ? styles.languageMenuOptionPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageMenuOptionText,
                      language === "en" ? styles.languageMenuOptionTextActive : null,
                    ]}
                  >
                    {copy.common.english}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => {
              setIsLanguageMenuOpen(false);
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
              setIsLanguageMenuOpen(false);
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

        <Text style={styles.helperText}>
          {mode === "student" ? copy.auth.studentHelper : copy.auth.businessHelper}
        </Text>
        {mode === "student" ? <GoogleSignInButton /> : <BusinessPasswordSignIn />}
      </InfoCard>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    helperText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    languageDropdown: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 6,
      padding: 10,
      position: "absolute",
      right: 0,
      top: 48,
      width: 164,
      zIndex: 20,
    },
    languageMenuOption: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    languageMenuOptionActive: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    languageMenuOptionPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    languageMenuOptionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
    },
    languageMenuOptionTextActive: {
      color: theme.colors.textPrimary,
    },
    languageMenuTitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      paddingHorizontal: 2,
    },
    languageMenuWrap: {
      position: "relative",
    },
    languageTrigger: {
      alignItems: "center",
      alignSelf: "flex-end",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 8,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    languageTriggerPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    languageTriggerText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      letterSpacing: 0.4,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    utilityRow: {
      alignItems: "flex-end",
    },
  });
