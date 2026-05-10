import type { PropsWithChildren } from "react";

import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  evaluateMobileReleaseGate,
  fetchMobileReleaseRequirementAsync,
  readCurrentMobileRelease,
} from "@/features/release/release-gate";
import { useUiPreferences } from "@/features/preferences/ui-preferences-provider";

const currentRelease = readCurrentMobileRelease();
const releaseRequirementQueryKey = ["mobile-release-requirement", currentRelease.platform] as const;

export const ReleaseGateProvider = ({ children }: PropsWithChildren) => {
  const { language, theme } = useUiPreferences();
  const releaseRequirementQuery = useQuery({
    queryKey: releaseRequirementQueryKey,
    queryFn: async () => fetchMobileReleaseRequirementAsync(currentRelease.platform),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (releaseRequirementQuery.isLoading && currentRelease.isReleaseBuild) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.screenBase }]}>
        <ActivityIndicator color={theme.colors.lime} size="small" />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {language === "fi" ? "Tarkistetaan versiota" : "Checking app version"}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {language === "fi"
            ? "Varmistamme, etta kaytossasi on tapahtumapaivaan turvallinen OmaLeima-versio."
            : "We are making sure this OmaLeima build is safe for event-day use."}
        </Text>
      </View>
    );
  }

  if (releaseRequirementQuery.error !== null && currentRelease.isReleaseBuild) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.screenBase }]}>
        <Text style={[styles.eyebrow, { color: theme.colors.warning }]}>OMA LEIMA</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {language === "fi" ? "Versiota ei voitu tarkistaa" : "Could not verify app version"}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {language === "fi"
            ? "Yhdista internetiin ja yrita uudelleen. Skannaus tarvitsee joka tapauksessa yhteyden palvelimeen."
            : "Connect to the internet and try again. Scanning also requires a server connection."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void releaseRequirementQuery.refetch()}
          style={[styles.button, { backgroundColor: theme.colors.actionPrimary }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.actionPrimaryText }]}>
            {language === "fi" ? "Yrita uudelleen" : "Try again"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const gateState = evaluateMobileReleaseGate(currentRelease, releaseRequirementQuery.data ?? null);

  if (gateState.status === "UNVERIFIED") {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.screenBase }]}>
        <Text style={[styles.eyebrow, { color: theme.colors.warning }]}>OMA LEIMA</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {language === "fi" ? "Versiota ei voitu tarkistaa" : "Could not verify app version"}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {language === "fi"
            ? "Versiovaatimus puuttuu palvelimelta. Yhdista internetiin ja yrita uudelleen."
            : "The release requirement is missing from the server. Connect to the internet and try again."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void releaseRequirementQuery.refetch()}
          style={[styles.button, { backgroundColor: theme.colors.actionPrimary }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.actionPrimaryText }]}>
            {language === "fi" ? "Yrita uudelleen" : "Try again"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (gateState.status === "BLOCKED") {
    const copy = language === "fi" ? gateState.requirement.message_fi : gateState.requirement.message_en;
    const updateUrl = gateState.requirement.update_url;

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.screenBase }]}>
        <Text style={[styles.eyebrow, { color: theme.colors.lime }]}>OMA LEIMA</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {language === "fi" ? "Paivitys vaaditaan" : "Update required"}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{copy}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {`Current ${gateState.currentRelease.appVersion} (${gateState.currentRelease.buildNumber ?? "n/a"}) · minimum ${gateState.requirement.minimum_app_version} (${gateState.requirement.minimum_build_number ?? "n/a"})`}
        </Text>
        {updateUrl !== null ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(updateUrl)}
            style={[styles.button, { backgroundColor: theme.colors.actionPrimary }]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.actionPrimaryText }]}>
              {language === "fi" ? "Avaa paivitys" : "Open update"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 28,
  },
  eyebrow: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  body: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 360,
    textAlign: "center",
  },
  meta: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  button: {
    borderRadius: 999,
    minHeight: 52,
    minWidth: 180,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  buttonText: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 14,
    textAlign: "center",
  },
});
