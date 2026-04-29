import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { ProfileTagCard } from "@/features/profile/components/profile-tag-card";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
import {
  useAttachDepartmentTagMutation,
  useCreateCustomDepartmentTagMutation,
  useRemoveDepartmentTagMutation,
  useSetPrimaryDepartmentTagMutation,
  useStudentProfileOverviewQuery,
} from "@/features/profile/student-profile";
import type { DepartmentTagSuggestion, StudentProfileTag } from "@/features/profile/types";
import {
  useRegisterPushDeviceMutation,
  type PushDeviceRegistrationResult,
} from "@/features/push/device-registration";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState, PushNotificationCapture } from "@/types/app";

const diagnosticsRefreshFormatter = new Intl.DateTimeFormat("en-FI", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const mapPushResultState = (state: PushDeviceRegistrationResult["state"]): AppReadinessState => {
  switch (state) {
    case "registered":
      return "ready";
    case "denied":
      return "warning";
    case "misconfigured":
      return "error";
    case "error":
      return "error";
    case "granted":
      return "ready";
    case "unavailable":
      return "pending";
  }
};

const createTagSummary = (count: number, remainingTagSlots: number): string => {
  if (count === 0) {
    return "No department tags selected yet.";
  }

  if (remainingTagSlots === 0) {
    return `All 3 profile tag slots are in use.`;
  }

  return `${count} tag${count === 1 ? "" : "s"} selected, ${remainingTagSlots} slot${remainingTagSlots === 1 ? "" : "s"} left.`;
};

const createSuggestionMeta = (tag: DepartmentTagSuggestion): string => {
  const locationParts = [tag.universityName, tag.city].filter((part): part is string => part !== null && part.length > 0);

  if (locationParts.length === 0) {
    return tag.slug;
  }

  return `${locationParts.join(" · ")} · ${tag.slug}`;
};

const createMutationError = (errors: (string | null)[]): string | null =>
  errors.find((error): error is string => error !== null) ?? null;

const mapPushRuntimeState = (
  runtime: "web" | "expo-go" | "development-build" | "standalone" | "bare",
  isPhysicalDevice: boolean
): AppReadinessState => {
  if (runtime === "development-build" && isPhysicalDevice) {
    return "ready";
  }

  if (runtime === "standalone" && isPhysicalDevice) {
    return "ready";
  }

  if (runtime === "expo-go") {
    return "warning";
  }

  if (runtime === "web") {
    return "pending";
  }

  return "warning";
};

const createPushRuntimeDetail = (
  runtime: "web" | "expo-go" | "development-build" | "standalone" | "bare",
  isPhysicalDevice: boolean
): string => {
  const deviceDetail = isPhysicalDevice ? "physical device" : "simulator or desktop runtime";

  switch (runtime) {
    case "development-build":
      return `Development build on ${deviceDetail}.`;
    case "standalone":
      return `Standalone build on ${deviceDetail}.`;
    case "expo-go":
      return `Expo Go on ${deviceDetail}; remote push smoke still needs a development build.`;
    case "web":
      return "Web preview cannot receive native remote push notifications.";
    case "bare":
      return `Bare runtime on ${deviceDetail}.`;
  }
};

const mapPushPermissionState = (
  state: "granted" | "denied" | "undetermined" | "provisional" | "unavailable"
): AppReadinessState => {
  switch (state) {
    case "granted":
    case "provisional":
      return "ready";
    case "denied":
      return "warning";
    case "undetermined":
      return "pending";
    case "unavailable":
      return "pending";
  }
};

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

const createNotificationCaptureDetail = (
  capture: PushNotificationCapture | null,
  emptyDetail: string
): string => {
  if (capture === null) {
    return emptyDetail;
  }

  const summaryParts = [
    capture.title ?? "Untitled notification",
    `${capture.source} / ${capture.triggerType}`,
    capture.dataType,
    capture.eventId,
    capture.rewardTierId,
    capture.actionIdentifier,
    capture.capturedAt,
  ].filter((part): part is string => part !== null && part.length > 0);

  return summaryParts.join(" · ");
};

const mapNotificationCaptureState = (capture: PushNotificationCapture | null): AppReadinessState => {
  if (capture === null) {
    return "pending";
  }

  if (capture.source === "remote") {
    return "ready";
  }

  return "warning";
};

const createNotificationCaptureStatusDetail = (
  capture: PushNotificationCapture | null,
  emptyDetail: string
): string => {
  const detail = createNotificationCaptureDetail(capture, emptyDetail);

  if (capture === null || capture.source === "remote") {
    return detail;
  }

  return `${detail} · Local notification activity does not prove remote APNs or FCM delivery yet.`;
};

const createDiagnosticsRefreshDetail = (value: string | null): string => {
  if (value === null) {
    return "No manual diagnostics refresh has been recorded in this app session yet.";
  }

  return `Last refreshed at ${diagnosticsRefreshFormatter.format(new Date(value))}.`;
};

export default function StudentProfileScreen() {
  const { bootstrapError, session } = useSession();
  const {
    clearCapturedPushActivity,
    diagnostics,
    refreshPushPermissionStateAsync,
  } = useNativePushDiagnostics();
  const studentId = session?.user.id ?? null;
  const [customTitle, setCustomTitle] = useState<string>("");
  const [pushState, setPushState] = useState<PushDeviceRegistrationResult | null>(null);
  const [isRefreshingPushDiagnostics, setIsRefreshingPushDiagnostics] = useState<boolean>(false);
  const [lastPushDiagnosticsRefreshAt, setLastPushDiagnosticsRefreshAt] = useState<string | null>(null);

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
    setLastPushDiagnosticsRefreshAt(new Date().toISOString());
  };

  const handleRefreshPushDiagnosticsPress = async (): Promise<void> => {
    setIsRefreshingPushDiagnostics(true);

    try {
      await refreshPushPermissionStateAsync();
      setLastPushDiagnosticsRefreshAt(new Date().toISOString());
    } finally {
      setIsRefreshingPushDiagnostics(false);
    }
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

  const primaryTag = selectedTags.find((tag) => tag.isPrimary) ?? null;
  const hasCapturedPushActivity =
    diagnostics.lastNotification !== null || diagnostics.lastNotificationResponse !== null;

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Profile">
        <Text selectable style={styles.bodyText}>
          Manage the study or department labels that describe this student profile. Official tags appear first, custom tags can still be created when the right label is missing, and one selected tag can stay primary for public display later.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Session"
        title="Profile state"
        items={[
          {
            label: "Persisted session",
            value: session?.user.email ?? bootstrapError ?? "No user session yet.",
            state: session ? "ready" : bootstrapError ? "error" : "pending",
          },
          {
            label: "Department tags",
            value:
              profileOverviewQuery.isLoading
                ? "Loading selected and suggested department tags."
                : profileOverviewQuery.error?.message ?? createTagSummary(selectedTags.length, remainingTagSlots),
            state: profileOverviewQuery.isLoading ? "loading" : profileOverviewQuery.error ? "error" : "ready",
          },
          {
            label: "Push backend",
            value: "register-device-token stays available for this student profile route.",
            state: "ready",
          },
        ]}
      />

      {profileOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening profile">
          <Text selectable style={styles.bodyText}>
            Loading profile identity, current department tags, and active tag suggestions.
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
        <InfoCard eyebrow="Account" title={profileOverview.displayName ?? "Student profile"}>
          <View style={styles.badgeRow}>
            <StatusBadge label={profileOverview.primaryRole.toLowerCase()} state="ready" />
            <StatusBadge label={profileOverview.status.toLowerCase()} state="ready" />
            {primaryTag ? <StatusBadge label={`primary: ${primaryTag.title}`} state="loading" /> : null}
          </View>
          <Text selectable style={styles.bodyText}>
            {profileOverview.email}
          </Text>
          <Text selectable style={styles.metaText}>{createTagSummary(selectedTags.length, remainingTagSlots)}</Text>
        </InfoCard>
      ) : null}

      {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
        <InfoCard eyebrow="Tags" title="Selected department tags">
          {selectedTags.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No tags selected yet. Pick an official suggestion first or create a custom tag if your study label is still missing.
            </Text>
          ) : (
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
          )}

          {latestTagMutationError ? (
            <Text selectable style={styles.errorText}>
              {latestTagMutationError}
            </Text>
          ) : null}
        </InfoCard>
      ) : null}

      {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
        <InfoCard eyebrow="Suggestions" title="Suggested department tags">
          <Text selectable style={styles.bodyText}>
            Official tags are shown first so students can reuse the community’s canonical labels before creating a new one.
          </Text>

          {suggestedTags.length === 0 ? (
            <Text selectable style={styles.metaText}>
              {selectedTags.length >= 3
                ? "All available slots are already in use."
                : "No extra active suggestions are available right now."}
            </Text>
          ) : (
            <View style={styles.stack}>
              {suggestedTags.map((tag) => (
                <View key={tag.id} style={styles.suggestionCard}>
                  <View style={styles.suggestionHeader}>
                    <View style={styles.suggestionCopy}>
                      <Text selectable style={styles.suggestionTitle}>
                        {tag.title}
                      </Text>
                      <Text selectable style={styles.metaText}>
                        {createSuggestionMeta(tag)}
                      </Text>
                    </View>
                    <StatusBadge label={tag.isOfficial ? "official" : "custom"} state={tag.isOfficial ? "loading" : "pending"} />
                  </View>
                  <Pressable
                    disabled={isTagMutationPending || remainingTagSlots === 0}
                    onPress={() => void handleAttachSuggestedTagPress(tag)}
                    style={[
                      styles.secondaryButton,
                      isTagMutationPending || remainingTagSlots === 0 ? styles.disabledButton : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {remainingTagSlots === 0 ? "Tag limit reached" : "Add tag"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
        <InfoCard eyebrow="Custom" title="Create custom tag">
          <Text selectable style={styles.bodyText}>
            Use this only when the right label does not already exist above. Matching active tags are reused automatically when possible.
          </Text>
          <TextInput
            autoCapitalize="words"
            editable={!isTagMutationPending && remainingTagSlots > 0}
            onChangeText={setCustomTitle}
            placeholder="Example: Tieto- ja viestintatekniikka"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={customTitle}
          />
          <Pressable
            disabled={isTagMutationPending || remainingTagSlots === 0 || customTitle.trim().length === 0}
            onPress={() => void handleCreateCustomTagPress()}
            style={[
              styles.primaryButton,
              isTagMutationPending || remainingTagSlots === 0 || customTitle.trim().length === 0 ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {remainingTagSlots === 0 ? "Tag limit reached" : "Create and add custom tag"}
            </Text>
          </Pressable>
        </InfoCard>
      ) : null}

      <InfoCard eyebrow="Push" title="Notification readiness">
        <Text selectable style={styles.bodyText}>
          Enable notifications on a physical device to request permission, obtain the Expo push token, and register it with the backend for this signed-in student.
        </Text>
        <Text selectable style={styles.metaText}>
          Expo Go is not enough for remote push testing on SDK 53 and later. Use a development build on a physical device for the full path.
        </Text>
        <Pressable
          style={[styles.primaryButton, registerPushMutation.isPending ? styles.disabledButton : null]}
          onPress={handleRegisterPushPress}
          disabled={registerPushMutation.isPending}
        >
          <Text style={styles.primaryButtonText}>
            {registerPushMutation.isPending ? "Enabling notifications..." : "Enable notifications on this device"}
          </Text>
        </Pressable>
      </InfoCard>

      {pushState ? (
        <FoundationStatusCard
          eyebrow="Result"
          title="Last notification registration result"
          items={[
            {
              label: "Device state",
              value: pushState.detail,
              state: mapPushResultState(pushState.state),
            },
            {
              label: "Expo token",
              value: pushState.expoPushToken ?? "No token produced in this run.",
              state: pushState.expoPushToken ? "ready" : "pending",
            },
            {
              label: "Backend registration",
              value:
                pushState.backendDeviceTokenId === null
                  ? pushState.backendStatus ?? "Token was not registered with the backend in this run."
                  : `Device token stored as ${pushState.backendDeviceTokenId}.`,
              state: pushState.backendDeviceTokenId === null ? mapPushResultState(pushState.state) : "ready",
            },
          ]}
        />
      ) : null}

      <FoundationStatusCard
        eyebrow="Diagnostics"
        title="Native push device smoke"
        items={[
          {
            label: "Runtime path",
            value: createPushRuntimeDetail(diagnostics.runtime, diagnostics.isPhysicalDevice),
            state: mapPushRuntimeState(diagnostics.runtime, diagnostics.isPhysicalDevice),
          },
          {
            label: "EAS project id",
            value: diagnostics.projectId ?? "Project id is missing from the app config.",
            state: diagnostics.projectId === null ? "error" : "ready",
          },
          {
            label: "Last diagnostics refresh",
            value: createDiagnosticsRefreshDetail(lastPushDiagnosticsRefreshAt),
            state: lastPushDiagnosticsRefreshAt === null ? "pending" : "ready",
          },
          {
            label: "Permission snapshot",
            value: createPushPermissionDetail(diagnostics.permissionState),
            state: mapPushPermissionState(diagnostics.permissionState),
          },
          {
            label: "Last received notification",
            value: createNotificationCaptureStatusDetail(
              diagnostics.lastNotification,
              "No notification has been captured in this app session yet."
            ),
            state: mapNotificationCaptureState(diagnostics.lastNotification),
          },
          {
            label: "Last notification response",
            value: createNotificationCaptureStatusDetail(
              diagnostics.lastNotificationResponse,
              "No notification open or action response has been captured yet."
            ),
            state: mapNotificationCaptureState(diagnostics.lastNotificationResponse),
          },
        ]}
      />

      <InfoCard eyebrow="Smoke" title="Manual device verification">
        <Text selectable style={styles.bodyText}>
          After installing a development build on a physical iPhone or Android device, use this profile route to confirm runtime mode, permission state, and the last remote push that reached or opened the app.
        </Text>
        <Text selectable style={styles.metaText}>
          Local foreground reward notifications can still appear here, but only rows marked from a remote source prove APNs or FCM-backed delivery.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            disabled={isRefreshingPushDiagnostics}
            onPress={() => void handleRefreshPushDiagnosticsPress()}
            style={[styles.secondaryButton, isRefreshingPushDiagnostics ? styles.disabledButton : null]}
          >
            <Text style={styles.secondaryButtonText}>
              {isRefreshingPushDiagnostics ? "Refreshing..." : "Refresh push diagnostics"}
            </Text>
          </Pressable>
          {hasCapturedPushActivity ? (
            <Pressable onPress={clearCapturedPushActivity} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear captured push activity</Text>
            </Pressable>
          ) : null}
        </View>
      </InfoCard>

      <InfoCard eyebrow="Account" title="Session actions">
        <Text selectable style={styles.bodyText}>
          Signing out should clear the local Supabase session and return the app to the Google login screen through the student route guard.
        </Text>
        <SignOutButton />
      </InfoCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
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
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  suggestionCopy: {
    flex: 1,
    gap: 4,
  },
  suggestionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  suggestionTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
});
