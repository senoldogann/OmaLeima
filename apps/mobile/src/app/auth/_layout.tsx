import { Redirect, Slot } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useIsScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

export default function AuthLayout() {
  const { isAuthenticated, isLoading, session } = useSession();
  const isScannerProvisioningActive = useIsScannerProvisioningActive();
  const { language } = useUiPreferences();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null && !isScannerProvisioningActive,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard
          eyebrow="Auth"
          title={language === "fi" ? "Tarkistetaan istuntoa" : "Checking session"}
        >
          <Text selectable style={styles.bodyText}>
            {language === "fi"
              ? "Palautetaan istuntoa ennen kirjautumisnäkymää."
              : "Restoring the Supabase session before showing the login flow."}
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (isScannerProvisioningActive) {
    return <Slot />;
  }

  if (isAuthenticated) {
    if (accessQuery.isLoading) {
      return (
        <AppScreen>
          <InfoCard
            eyebrow="Auth"
            title={language === "fi" ? "Haetaan kohdetta" : "Resolving destination"}
          >
            <Text selectable style={styles.bodyText}>
              {language === "fi"
                ? "Kirjauduttu sisään. Valitaan oikeaa mobiilialuetta."
                : "This authenticated user is signed in. OmaLeima is choosing the correct mobile area now."}
            </Text>
          </InfoCard>
        </AppScreen>
      );
    }

    if (accessQuery.error) {
      return (
        <AppScreen>
          <AccessIssueCard
            title={language === "fi" ? "Käyttöoikeuden tarkistus epäonnistui" : "Access check failed"}
            detail={createUserSafeErrorMessage(accessQuery.error, language, "access")}
            retryLabel={language === "fi" ? "Yritä uudelleen" : "Retry access check"}
            onRetry={() => void accessQuery.refetch()}
          />
        </AppScreen>
      );
    }

    if (accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
      return <Redirect href={accessQuery.data.homeHref} />;
    }

    return (
      <AppScreen>
        <AccessIssueCard
          title={language === "fi" ? "Tiliä ei voi käyttää" : "This account is not allowed here"}
          detail={
            language === "fi"
              ? "Tällä tilillä ei ole aktiivista opiskelija-, yritys- tai klubiroolia mobiilisovelluksessa."
              : "This authenticated account cannot enter the shared mobile auth flow because it does not have an active student, business, or club mobile role."
          }
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
