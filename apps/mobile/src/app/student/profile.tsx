import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { ProfileTagCard } from "@/features/profile/components/profile-tag-card";
import {
  useAttachDepartmentTagMutation,
  useCreateCustomDepartmentTagMutation,
  useRemoveDepartmentTagMutation,
  useSetPrimaryDepartmentTagMutation,
  useStudentProfileOverviewQuery,
} from "@/features/profile/student-profile";
import type { DepartmentTagSuggestion, StudentProfileTag } from "@/features/profile/types";
import { useRegisterPushDeviceMutation, type PushDeviceRegistrationResult } from "@/features/push/device-registration";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
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
  const [isTagModalVisible, setIsTagModalVisible] = useState<boolean>(false);

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

  const handleAttachSuggestedTagPress = async (tag: DepartmentTagSuggestion): Promise<void> => {
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

  const handleSetPrimaryTagPress = async (tag: StudentProfileTag): Promise<void> => {
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
      remainingTags: selectedTags.filter((selectedTag) => selectedTag.linkId !== tag.linkId),
    });
  };

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Text style={styles.metaText}>Keep your account ready for the next event.</Text>
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
          <Pressable onPress={() => void profileOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {profileOverview ? (
        <View style={styles.profileStage}>
          <View style={styles.profileHero}>
            <View style={styles.avatarShell}>
              <View style={styles.avatarCore}>
                <AppIcon color={mobileTheme.colors.screenBase} name="user" size={34} />
              </View>
            </View>

            <View style={styles.profileCopy}>
              <Text selectable style={styles.profileName}>
                {profileOverview.displayName ?? "Student profile"}
              </Text>
              <Text selectable style={styles.accountEmail}>{profileOverview.email}</Text>
              <Text selectable style={styles.roleLine}>
                {profileOverview.primaryRole.toLowerCase()} student
              </Text>
            </View>
          </View>

          <View style={styles.accountMetaRow}>
            <Text selectable style={styles.accountMetaInline}>
              {selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"}
            </Text>
            <Text selectable style={styles.accountMetaDot}>•</Text>
            <Text selectable style={styles.accountMetaInline}>
              {remainingTagSlots} left
            </Text>
            <Text selectable style={styles.accountMetaDot}>•</Text>
            <Text selectable style={styles.accountMetaInline}>
              {profileOverview.status.toLowerCase()}
            </Text>
          </View>
        </View>
      ) : null}

      {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
        <View style={styles.tagsEntrySection}>
          <View style={styles.tagsEntryCopy}>
            <Text selectable style={styles.tagsEntryTitle}>Department tags</Text>
            <Text selectable style={styles.metaText}>
              {createTagSummary(selectedTags.length, remainingTagSlots)}
            </Text>
          </View>

          <Pressable onPress={() => setIsTagModalVisible(true)} style={styles.secondaryButton}>
            <View style={styles.secondaryButtonRow}>
              <Text style={styles.secondaryButtonText}>Manage</Text>
              <AppIcon color={mobileTheme.colors.textPrimary} name="chevron-right" size={16} />
            </View>
          </Pressable>
        </View>
      ) : null}

      {latestTagMutationError ? <Text selectable style={styles.errorText}>{latestTagMutationError}</Text> : null}

      <InfoCard eyebrow="Push" title="Notifications">
        <Text selectable style={styles.bodyText}>
          Turn on notifications here so reward unlocks and event-day updates can reach this device.
        </Text>
        <Text selectable style={styles.metaText}>
          {createPushPreferenceSummary(diagnostics.permissionState, pushState)}
        </Text>
        {pushState !== null ? (
          <Text selectable style={pushState.state === "error" ? styles.errorText : styles.metaText}>
            {pushState.detail}
          </Text>
        ) : null}
        <Pressable
          disabled={registerPushMutation.isPending}
          onPress={handleRegisterPushPress}
          style={[styles.primaryButton, registerPushMutation.isPending ? styles.disabledButton : null]}
        >
          <Text style={styles.primaryButtonText}>
            {registerPushMutation.isPending ? "Enabling notifications..." : "Enable notifications"}
          </Text>
        </Pressable>
      </InfoCard>

      <SignOutButton />

      <Modal
        animationType="slide"
        onRequestClose={() => setIsTagModalVisible(false)}
        transparent
        visible={isTagModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>Profile tags</Text>
                <Text style={styles.modalTitle}>Manage department tags</Text>
              </View>
              <Pressable onPress={() => setIsTagModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {selectedTags.length > 0 ? (
                <View style={styles.stack}>
                  {selectedTags.map((tag) => (
                    <ProfileTagCard
                      key={tag.linkId}
                      isBusy={isTagMutationPending}
                      onRemove={handleRemoveTagPress}
                      onSetPrimary={handleSetPrimaryTagPress}
                      tag={tag}
                    />
                  ))}
                </View>
              ) : (
                <Text selectable style={styles.bodyText}>
                  No tags selected yet. Pick a suggestion or create one.
                </Text>
              )}

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
                          isTagMutationPending || remainingTagSlots === 0 ? styles.disabledButton : null,
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
                      isTagMutationPending || customTitle.trim().length === 0 ? styles.disabledButton : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Create custom tag</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountEmail: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  accountMetaDot: {
    color: mobileTheme.colors.textDim,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  accountMetaInline: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  accountMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  avatarCore: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarShell: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  createGroup: {
    gap: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: "#FCA5A5",
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  input: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.body,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.66)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCloseText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
  modalEyebrow: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  modalScrollContent: {
    gap: 16,
    paddingBottom: 20,
  },
  modalSheet: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
    maxHeight: "82%",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  modalTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    lineHeight: mobileTheme.typography.lineHeights.subtitle,
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
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
  profileCopy: {
    flex: 1,
    gap: 6,
  },
  profileHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  profileName: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    lineHeight: mobileTheme.typography.lineHeights.subtitle,
  },
  profileStage: {
    gap: 14,
    paddingBottom: 4,
  },
  roleLine: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 0.8,
    lineHeight: mobileTheme.typography.lineHeights.caption,
    textTransform: "uppercase",
  },
  screenHeader: {
    gap: 6,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.titleLarge,
    letterSpacing: -0.8,
    lineHeight: mobileTheme.typography.lineHeights.titleLarge,
  },
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
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
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  tagsEntryCopy: {
    flex: 1,
    gap: 4,
  },
  tagsEntrySection: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  tagsEntryTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    lineHeight: mobileTheme.typography.lineHeights.subtitle,
  },
});
