import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { AppScreen } from "@/components/app-screen";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { ProfileTagCard } from "@/features/profile/components/profile-tag-card";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
import {
  useAttachDepartmentTagMutation,
  useCreateCustomDepartmentTagMutation,
  useRemoveDepartmentTagMutation,
  useSetPrimaryDepartmentTagMutation,
  useStudentProfileOverviewQuery,
} from "@/features/profile/student-profile";
import type {
  DepartmentTagSuggestion,
  StudentProfileTag,
} from "@/features/profile/types";
import {
  useRegisterPushDeviceMutation,
  type PushDeviceRegistrationResult,
} from "@/features/push/device-registration";
import { useSession } from "@/providers/session-provider";

const createTagSummary = (count: number, remainingTagSlots: number): string => {
  if (count === 0) {
    return "No department tags selected yet.";
  }

  if (remainingTagSlots === 0) {
    return "All 3 profile tag slots are in use.";
  }

  return `${count} tag${count === 1 ? "" : "s"} selected, ${remainingTagSlots} slot${remainingTagSlots === 1 ? "" : "s"} left.`;
};

const createSuggestionMeta = (tag: DepartmentTagSuggestion): string => {
  const locationParts = [tag.universityName, tag.city].filter(
    (part): part is string => part !== null && part.length > 0
  );

  if (locationParts.length === 0) {
    return tag.slug;
  }

  return `${locationParts.join(" · ")} · ${tag.slug}`;
};

const createMutationError = (errors: (string | null)[]): string | null =>
  errors.find((error): error is string => error !== null) ?? null;

const createPushPermissionDetail = (
  state: "granted" | "denied" | "undetermined" | "provisional" | "unavailable"
): string => {
  switch (state) {
    case "granted":
      return "Notification permission is granted.";
    case "provisional":
      return "Notification permission is provisionally granted on iOS.";
    case "denied":
      return "Notification permission is denied on this device.";
    case "undetermined":
      return "Notification permission has not been granted yet in this app session.";
    case "unavailable":
      return "Notification permission is unavailable in this runtime.";
  }
};

const createPushPreferenceSummary = (
  permissionState: "granted" | "denied" | "undetermined" | "provisional" | "unavailable",
  pushState: PushDeviceRegistrationResult | null
): string => {
  if (pushState?.state === "registered") {
    return "Notifications are active on this device.";
  }

  return createPushPermissionDetail(permissionState);
};

export default function StudentProfileScreen() {
  const { session } = useSession();
  const { diagnostics, refreshPushPermissionStateAsync } = useNativePushDiagnostics();
  const studentId = session?.user.id ?? null;
  const [customTitle, setCustomTitle] = useState<string>("");
  const [pushState, setPushState] = useState<PushDeviceRegistrationResult | null>(null);

  const profileOverviewQuery = useStudentProfileOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const attachTagMutation = useAttachDepartmentTagMutation();
  const createCustomTagMutation = useCreateCustomDepartmentTagMutation();
  const setPrimaryTagMutation = useSetPrimaryDepartmentTagMutation();
  const removeTagMutation = useRemoveDepartmentTagMutation();
  const registerPushMutation = useRegisterPushDeviceMutation();

  const profileOverview = profileOverviewQuery.data ?? null;
  const selectedTags = profileOverview?.selectedTags ?? [];
  const suggestedTags = profileOverview?.suggestedTags ?? [];
  const remainingTagSlots = profileOverview?.remainingTagSlots ?? 3;
  const isTagMutationPending =
    attachTagMutation.isPending ||
    createCustomTagMutation.isPending ||
    setPrimaryTagMutation.isPending ||
    removeTagMutation.isPending;

  const latestTagMutationError = useMemo(
    () =>
      createMutationError([
        attachTagMutation.error?.message ?? null,
        createCustomTagMutation.error?.message ?? null,
        setPrimaryTagMutation.error?.message ?? null,
        removeTagMutation.error?.message ?? null,
      ]),
    [
      attachTagMutation.error?.message,
      createCustomTagMutation.error?.message,
      removeTagMutation.error?.message,
      setPrimaryTagMutation.error?.message,
    ]
  );

  const handleRegisterPushPress = async (): Promise<void> => {
    const result = await registerPushMutation.mutateAsync({
      accessToken: session?.access_token ?? "",
    });
    setPushState(result);
    await refreshPushPermissionStateAsync();
  };

  const handleAttachSuggestedTagPress = async (
    tag: DepartmentTagSuggestion
  ): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await attachTagMutation.mutateAsync({
      studentId,
      departmentTagId: tag.id,
      currentTags: selectedTags,
    });
  };

  const handleCreateCustomTagPress = async (): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await createCustomTagMutation.mutateAsync({
      studentId,
      title: customTitle,
      currentTags: selectedTags,
    });
    setCustomTitle("");
  };

  const handleSetPrimaryTagPress = async (
    tag: StudentProfileTag
  ): Promise<void> => {
    if (studentId === null || tag.isPrimary) {
      return;
    }

    await setPrimaryTagMutation.mutateAsync({
      studentId,
      linkId: tag.linkId,
    });
  };

  const handleRemoveTagPress = async (tag: StudentProfileTag): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await removeTagMutation.mutateAsync({
      studentId,
      tag,
      remainingTags: selectedTags.filter(
        (selectedTag) => selectedTag.linkId !== tag.linkId
      ),
    });
  };

  const primaryTag = selectedTags.find((tag) => tag.isPrimary) ?? null;

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Text style={styles.metaText}>Keep your identity and notifications ready for the next event.</Text>
      </View>

      {profileOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening profile">
          <Text selectable style={styles.bodyText}>
            Loading profile identity, active tags, and suggestions.
          </Text>
        </InfoCard>
      ) : null}

      {profileOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load profile">
          <Text selectable style={styles.bodyText}>{profileOverviewQuery.error.message}</Text>
          <Pressable
            onPress={() => void profileOverviewQuery.refetch()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {profileOverview ? (
        <InfoCard eyebrow="Account" title={profileOverview.displayName ?? "Student profile"}>
          <Text selectable style={styles.accountEmail}>{profileOverview.email}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={profileOverview.primaryRole.toLowerCase()} state="ready" />
            {primaryTag ? (
              <StatusBadge label={`primary: ${primaryTag.title}`} state="pending" />
            ) : null}
          </View>
          <View style={styles.accountMetaRow}>
            <View style={styles.accountMetaPill}>
              <Text selectable style={styles.accountMetaValue}>{selectedTags.length}</Text>
              <Text selectable style={styles.accountMetaLabel}>tags</Text>
            </View>
            <View style={styles.accountMetaPill}>
              <Text selectable style={styles.accountMetaValue}>{remainingTagSlots}</Text>
              <Text selectable style={styles.accountMetaLabel}>left</Text>
            </View>
            <View style={styles.accountMetaPill}>
              <Text selectable style={styles.accountMetaValue}>{profileOverview.status.toLowerCase()}</Text>
              <Text selectable style={styles.accountMetaLabel}>status</Text>
            </View>
          </View>
        </InfoCard>
      ) : null}

      {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
        <InfoCard eyebrow="Tags" title="Department tags">
          {selectedTags.length > 0 ? (
            <View style={styles.stack}>
              {selectedTags.map((tag) => (
                <ProfileTagCard
                  key={tag.linkId}
                  tag={tag}
                  isBusy={isTagMutationPending}
                  onSetPrimary={handleSetPrimaryTagPress}
                  onRemove={handleRemoveTagPress}
                />
              ))}
            </View>
          ) : (
            <Text selectable style={styles.bodyText}>
              No tags selected yet. Pick a suggestion or create one.
            </Text>
          )}

          <Text selectable style={styles.metaText}>
            {createTagSummary(selectedTags.length, remainingTagSlots)}
          </Text>

          {suggestedTags.length > 0 ? (
            <View style={styles.suggestionGroup}>
              <Text style={styles.sectionLabel}>Suggestions</Text>
              <View style={styles.suggestionList}>
                {suggestedTags.map((tag) => (
                  <Pressable
                    key={tag.id}
                    disabled={isTagMutationPending || remainingTagSlots === 0}
                    onPress={() => void handleAttachSuggestedTagPress(tag)}
                    style={[
                      styles.suggestionChip,
                      isTagMutationPending || remainingTagSlots === 0
                        ? styles.disabledButton
                        : null,
                    ]}
                  >
                    <Text style={styles.suggestionTitle}>{tag.title}</Text>
                    <Text style={styles.metaText}>{createSuggestionMeta(tag)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {remainingTagSlots > 0 ? (
            <View style={styles.createGroup}>
              <Text style={styles.sectionLabel}>Need a custom one?</Text>
              <TextInput
                autoCapitalize="words"
                editable={!isTagMutationPending}
                onChangeText={setCustomTitle}
                placeholder="Example: Tieto- ja viestintatekniikka"
                placeholderTextColor="#64748B"
                style={styles.input}
                value={customTitle}
              />
              <Pressable
                disabled={isTagMutationPending || customTitle.trim().length === 0}
                onPress={() => void handleCreateCustomTagPress()}
                style={[
                  styles.secondaryButton,
                  isTagMutationPending || customTitle.trim().length === 0
                    ? styles.disabledButton
                    : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Create custom tag</Text>
              </Pressable>
            </View>
          ) : null}

          {latestTagMutationError ? (
            <Text selectable style={styles.errorText}>{latestTagMutationError}</Text>
          ) : null}
        </InfoCard>
      ) : null}

      <InfoCard eyebrow="Push" title="Notifications">
        <Text selectable style={styles.bodyText}>
          Turn on notifications here so reward unlocks and event-day updates can reach this device.
        </Text>
        <Text selectable style={styles.metaText}>
          {createPushPreferenceSummary(diagnostics.permissionState, pushState)}
        </Text>
        {pushState !== null ? (
          <Text
            selectable
            style={pushState.state === "error" ? styles.errorText : styles.metaText}
          >
            {pushState.detail}
          </Text>
        ) : null}
        <Pressable
          style={[
            styles.primaryButton,
            registerPushMutation.isPending ? styles.disabledButton : null,
          ]}
          onPress={handleRegisterPushPress}
          disabled={registerPushMutation.isPending}
        >
          <Text style={styles.primaryButtonText}>
            {registerPushMutation.isPending
              ? "Enabling notifications..."
              : "Enable notifications"}
          </Text>
        </Pressable>
      </InfoCard>

      <SignOutButton />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountEmail: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  accountMetaLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  accountMetaPill: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.chip,
    gap: 2,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  accountMetaValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  createGroup: {
    gap: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  screenHeader: {
    gap: 6,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.card,
    gap: 4,
    padding: 14,
    ...interactiveSurfaceShadowStyle,
  },
  suggestionGroup: {
    gap: 10,
  },
  suggestionList: {
    gap: 8,
  },
  suggestionTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
