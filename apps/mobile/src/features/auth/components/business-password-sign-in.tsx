import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { AppIcon } from "@/components/app-icon";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { fetchSessionAccessAsync, sessionAccessQueryKey, type SessionAccess } from "@/features/auth/session-access";
import {
  interactiveSurfaceShadowStyle,
  type MobileTheme,
} from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { provisionBusinessScannerSessionAsync } from "@/features/scanner/business-scanner-login";
import { setScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { supabase } from "@/lib/supabase";

const requiresWebPanel = (access: SessionAccess): boolean =>
  access.primaryRole === "PLATFORM_ADMIN";

const isProvisionedScannerAccess = (access: SessionAccess): boolean =>
  access.area === "business" && access.homeHref === "/business/scanner" && access.isBusinessScannerOnly;

type BusinessQrScannerPanelProps = {
  isVisible: boolean;
  onClose: () => void;
};

const BusinessQrScannerPanel = ({ isVisible, onClose }: BusinessQrScannerPanelProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const { language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const provisioningLockRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setErrorMessage(null);

    if (permission !== null && permission.granted) {
      return;
    }

    void requestPermission().then((nextPermission) => {
      if (nextPermission.granted) {
        return;
      }

      setErrorMessage(
        language === "fi" ? "Kameralupa tarvitaan QR-kirjautumiseen." : "Camera access is required for QR sign-in."
      );
    });
  }, [isVisible, language, permission, requestPermission]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult): Promise<void> => {
    if (provisioningLockRef.current || isProvisioning) {
      return;
    }

    const qrToken = result.data.trim();

    if (qrToken.length === 0) {
      return;
    }

    provisioningLockRef.current = true;
    setIsProvisioning(true);
    setScannerProvisioningActive(true);
    setErrorMessage(null);
    let didProvisionSuccessfully = false;

    try {
      await supabase.auth.signOut();
      const { data: anonymousSignInData, error: anonymousSignInError } = await supabase.auth.signInAnonymously();

      if (anonymousSignInError !== null) {
        throw new Error(`Anonymous scanner sign-in failed: ${anonymousSignInError.message}`);
      }

      const scannerUserId = anonymousSignInData.user?.id;

      if (typeof scannerUserId !== "string") {
        throw new Error("Anonymous scanner sign-in completed without a user id.");
      }

      const provisionedSession = await provisionBusinessScannerSessionAsync({
        businessName: null,
        qrToken,
      });
      await queryClient.invalidateQueries({ queryKey: sessionAccessQueryKey(scannerUserId) });
      const access = await fetchSessionAccessAsync(scannerUserId);

      if (!isProvisionedScannerAccess(access)) {
        throw new Error(
          `Scanner provisioning did not produce active scanner access. Area: ${access.area}. Profile status: ${access.profileStatus}.`
        );
      }

      queryClient.setQueryData(sessionAccessQueryKey(scannerUserId), access);
      router.replace(provisionedSession.homeHref);
      didProvisionSuccessfully = true;
    } catch (error) {
      await supabase.auth.signOut();
      setErrorMessage(error instanceof Error ? error.message : "Unknown QR scanner sign-in error.");
    } finally {
      setScannerProvisioningActive(false);
      setIsProvisioning(false);
      if (!didProvisionSuccessfully) {
        provisioningLockRef.current = false;
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.qrSignInCard}>
      <View style={styles.qrSignInHeader}>
        <View style={styles.qrSignInIcon}>
          <AppIcon color={theme.colors.lime} name="scan" size={18} />
        </View>
        <View style={styles.qrSignInCopy}>
          <Text style={styles.qrSignInTitle}>
            {language === "fi" ? "Kirjaudu scanner QR:lla" : "Sign in with scanner QR"}
          </Text>
          <Text style={styles.qrSignInText}>
            {language === "fi"
              ? "Työntekijä voi skannata omistajan QR-koodin ilman jaettua salasanaa."
              : "Staff can scan the owner's QR without sharing a password."}
          </Text>
        </View>
      </View>

      {permission?.granted ? (
        <View style={styles.qrCameraStage}>
          <View style={styles.qrCameraWrap}>
          <CameraView
            active={!isProvisioning}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={isProvisioning ? undefined : (result) => void handleBarcodeScanned(result)}
            style={styles.qrCamera}
          />
          {isProvisioning ? (
            <View style={styles.qrCameraOverlay}>
              <ActivityIndicator color={theme.colors.lime} size="small" />
              <Text style={styles.qrCameraOverlayText}>
                {language === "fi" ? "Luodaan scanner-käyttöä..." : "Creating scanner access..."}
              </Text>
            </View>
          ) : null}
        </View>
          <Text style={styles.qrCameraHint}>
            {language === "fi"
              ? "Kohdista kamera ownerin QR-koodiin."
              : "Point the camera at the owner's QR code."}
          </Text>
        </View>
      ) : (
        <View style={styles.qrPermissionCard}>
          <Text style={styles.qrSignInText}>
            {language === "fi"
              ? "Salli kameran käyttö, jotta QR-kirjautuminen voidaan avata."
              : "Allow camera access to open QR sign-in."}
          </Text>
          <Pressable disabled={isProvisioning} onPress={() => void requestPermission()} style={styles.qrRetryButton}>
            <Text style={styles.qrRetryButtonText}>{language === "fi" ? "Salli kamera" : "Allow camera"}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.qrSignInActions}>
        <Pressable disabled={isProvisioning} onPress={onClose} style={styles.qrCancelButton}>
          <Text style={styles.qrCancelButtonText}>{language === "fi" ? "Palaa kirjautumiseen" : "Back to sign in"}</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

export const BusinessPasswordSignIn = ({
  isQrScannerVisible,
  onQrScannerVisibilityChange,
}: {
  isQrScannerVisible: boolean;
  onQrScannerVisibilityChange: (isVisible: boolean) => void;
}) => {
  const router = useRouter();
  const theme = useAppTheme();
  const { copy, language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const passwordInputRef = useRef<TextInput | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error !== null) {
      setIsLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (typeof userId !== "string") {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Password sign-in returned without a user id.");
      return;
    }

    try {
      const access = await fetchSessionAccessAsync(userId);

      if ((access.area !== "business" && access.area !== "club") || access.homeHref === null) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage(requiresWebPanel(access) ? copy.business.webPanelRequired : copy.business.accessMissing);
        return;
      }

      setIsLoading(false);
      router.replace(access.homeHref);
    } catch (error) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Unknown business sign-in error.");
    }
  };

  const canSubmit = !isLoading && email.trim().length > 0 && password.length > 0;

  return (
    <View style={styles.container}>
      {isQrScannerVisible ? (
        <BusinessQrScannerPanel isVisible={isQrScannerVisible} onClose={() => onQrScannerVisibilityChange(false)} />
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{copy.auth.businessEmail}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              placeholder={copy.auth.businessEmailPlaceholder}
              placeholderTextColor={theme.colors.textDim}
              returnKeyType="next"
              style={styles.input}
              submitBehavior="submit"
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{copy.auth.businessPassword}</Text>
            <TextInput
              editable={!isLoading}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                if (canSubmit) {
                  void handlePress();
                }
              }}
              placeholder={copy.auth.businessPasswordPlaceholder}
              placeholderTextColor={theme.colors.textDim}
              ref={passwordInputRef}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              submitBehavior="blurAndSubmit"
              value={password}
            />
          </View>

          <View style={styles.primaryActionRow}>
            <Pressable
              disabled={!canSubmit}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.button,
                styles.primaryActionButton,
                !canSubmit ? styles.disabledButton : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              {isLoading ? <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" /> : null}
              {isLoading ? null : <AppIcon color={theme.colors.actionPrimaryText} name="business" size={18} />}
              <Text style={styles.buttonText}>{isLoading ? copy.auth.businessSigningIn : copy.auth.businessButton}</Text>
            </Pressable>

            <Pressable
              disabled={isLoading}
              onPress={() => {
                setErrorMessage(null);
                onQrScannerVisibilityChange(true);
              }}
              style={({ pressed }) => [
                styles.qrInlineButton,
                isLoading ? styles.disabledButton : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <AppIcon color={theme.colors.textPrimary} name="scan" size={18} />
              <Text style={styles.qrInlineButtonText}>
                {language === "fi" ? "Scan owner QR" : "Scan owner QR"}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {isLoading ? (
        <AuthLoadingPanel
          message={copy.auth.businessCheckingAccess}
          title={copy.auth.businessSigningIn}
        />
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    buttonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    buttonText: {
      color: theme.colors.actionPrimaryText,
      fontSize: 14,
      fontWeight: "800",
    },
    container: {
      gap: 12,
    },
    disabledButton: {
      opacity: 0.8,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
    },
    fieldGroup: {
      gap: 7,
    },
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 16,
      color: theme.colors.textPrimary,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    primaryActionButton: {
      flex: 1,
    },
    primaryActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    qrCamera: {
      minHeight: 272,
      width: "100%",
    },
    qrCameraHint: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: "center",
    },
    qrCameraStage: {
      gap: 10,
    },
    qrCameraOverlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.58)",
      bottom: 0,
      gap: 10,
      justifyContent: "center",
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    qrCameraOverlayText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    qrCameraWrap: {
      borderRadius: 18,
      minHeight: 272,
      overflow: "hidden",
      position: "relative",
    },
    qrCancelButton: {
      alignItems: "center",
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    qrCancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "800",
    },
    qrSignInActions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    qrInlineButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    qrInlineButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
    },
    qrPermissionCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 16,
    },
    qrRetryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    qrRetryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
    },
    qrSignInCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 12,
    },
    qrSignInCopy: {
      flex: 1,
      gap: 3,
    },
    qrSignInHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    qrSignInIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    qrSignInText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    qrSignInTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "900",
    },
  });
