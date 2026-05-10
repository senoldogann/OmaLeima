import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { InfoCard } from "@/components/info-card";
import {
  setPreferredMobileRoleAreaAsync,
  type MobileRoleArea,
} from "@/features/auth/mobile-role-preference";
import { sessionAccessQueryKey, useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const getHomeHrefForArea = (area: MobileRoleArea): "/student/events" | "/business/home" | "/club/home" => {
  if (area === "business") {
    return "/business/home";
  }

  if (area === "club") {
    return "/club/home";
  }

  return "/student/events";
};

const getAreaLabel = (area: MobileRoleArea, language: "fi" | "en"): string => {
  if (area === "business") {
    return language === "fi" ? "Yritys" : "Business";
  }

  if (area === "club") {
    return language === "fi" ? "Järjestäjä" : "Organizer";
  }

  return language === "fi" ? "Opiskelija" : "Student";
};

const getAreaIconName = (area: MobileRoleArea): "business" | "calendar" | "user" => {
  if (area === "business") {
    return "business";
  }

  if (area === "club") {
    return "calendar";
  }

  return "user";
};

type MobileRoleSwitchCardProps = {
  currentArea: MobileRoleArea;
};

export const MobileRoleSwitchCard = ({ currentArea }: MobileRoleSwitchCardProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { isAuthenticated, session } = useSession();
  const userId = session?.user.id ?? null;
  const accessQuery = useSessionAccessQuery({
    userId: userId ?? "",
    isEnabled: isAuthenticated && userId !== null,
  });
  const [pendingArea, setPendingArea] = useState<MobileRoleArea | null>(null);
  const access = accessQuery.data;

  if (
    userId === null ||
    typeof access === "undefined" ||
    access.isBusinessScannerOnly ||
    access.availableAreas.length <= 1
  ) {
    return null;
  }

  const handleAreaPressAsync = async (area: MobileRoleArea): Promise<void> => {
    if (area === currentArea || pendingArea !== null) {
      return;
    }

    setPendingArea(area);

    try {
      await setPreferredMobileRoleAreaAsync(area);
      await queryClient.invalidateQueries({
        queryKey: sessionAccessQueryKey(userId),
      });
      await queryClient.refetchQueries({
        queryKey: sessionAccessQueryKey(userId),
      });
      router.replace(getHomeHrefForArea(area));
    } finally {
      setPendingArea(null);
    }
  };

  return (
    <InfoCard
      eyebrow={language === "fi" ? "Rooli" : "Role"}
      title={language === "fi" ? "Vaihda mobiilinäkymää" : "Switch mobile area"}
      variant="subtle"
    >
      <Text style={styles.bodyText}>
        {language === "fi"
          ? "Tällä tilillä on useampi aktiivinen rooli. Valitse missä näkymässä jatkat."
          : "This account has multiple active roles. Choose which area to use."}
      </Text>
      <View style={styles.switchRow}>
        {access.availableAreas.map((area) => {
          const isActive = area === currentArea;
          const isPending = area === pendingArea;

          return (
            <Pressable
              disabled={isActive || pendingArea !== null}
              key={area}
              onPress={() => void handleAreaPressAsync(area)}
              style={[
                styles.switchButton,
                isActive ? styles.switchButtonActive : null,
                pendingArea !== null && !isPending ? styles.switchButtonDisabled : null,
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={theme.colors.textPrimary} size="small" />
              ) : (
                <AppIcon
                  color={isActive ? theme.colors.actionPrimaryText : theme.colors.textPrimary}
                  name={getAreaIconName(area)}
                  size={16}
                />
              )}
              <Text style={[styles.switchButtonText, isActive ? styles.switchButtonTextActive : null]}>
                {getAreaLabel(area, language)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </InfoCard>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    switchButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    switchButtonActive: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.lime,
    },
    switchButtonDisabled: {
      opacity: 0.58,
    },
    switchButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    switchButtonTextActive: {
      color: theme.colors.actionPrimaryText,
    },
    switchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
  });
