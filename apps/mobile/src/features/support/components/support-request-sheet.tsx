import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useCreateSupportRequestMutation, useSupportRequestsQuery } from "@/features/support/support-requests";
import type {
  BusinessSupportOption,
  SupportRequestArea,
  SupportRequestStatus,
} from "@/features/support/types";

type SupportRequestSheetProps = {
  area: SupportRequestArea;
  businessOptions: readonly BusinessSupportOption[];
  isVisible: boolean;
  onClose: () => void;
  userId: string | null;
};

const formatDateTime = (localeTag: string, value: string): string =>
  new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const createStatusLabel = (language: "fi" | "en", status: SupportRequestStatus): string => {
  if (language === "fi") {
    switch (status) {
      case "OPEN":
        return "Avoin";
      case "IN_PROGRESS":
        return "Käsittelyssä";
      case "RESOLVED":
        return "Ratkaistu";
      case "CLOSED":
        return "Suljettu";
    }
  }

  switch (status) {
    case "OPEN":
      return "Open";
    case "IN_PROGRESS":
      return "In progress";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
  }
};

const createTitle = (area: SupportRequestArea, language: "fi" | "en"): string => {
  if (area === "BUSINESS") {
    return language === "fi" ? "Yrityksen tuki" : "Business support";
  }

  return language === "fi" ? "Opiskelijan tuki" : "Student support";
};

const createEmptyHistory = (area: SupportRequestArea, language: "fi" | "en"): string => {
  if (area === "BUSINESS") {
    return language === "fi"
      ? "Tukipyyntöjä ei ole vielä lähetetty tällä yritystilillä."
      : "No support requests have been sent from this business account yet.";
  }

  return language === "fi"
    ? "Tukipyyntöjä ei ole vielä lähetetty tällä opiskelijatilillä."
    : "No support requests have been sent from this student account yet.";
};

export const SupportRequestSheet = ({
  area,
  businessOptions,
  isVisible,
  onClose,
  userId,
}: SupportRequestSheetProps) => {
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const supportQuery = useSupportRequestsQuery({
    userId: userId ?? "",
    area,
    isEnabled: isVisible && userId !== null,
  });
  const createMutation = useCreateSupportRequestMutation();
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (area !== "BUSINESS") {
      setSelectedBusinessId(null);
      return;
    }

    const nextBusinessId = businessOptions[0]?.businessId ?? null;
    setSelectedBusinessId((currentValue) => {
      if (currentValue !== null && businessOptions.some((option) => option.businessId === currentValue)) {
        return currentValue;
      }

      return nextBusinessId;
    });
  }, [area, businessOptions]);

  const canSubmit =
    userId !== null &&
    !createMutation.isPending &&
    subject.trim().length >= 3 &&
    message.trim().length >= 12 &&
    (area === "STUDENT" || selectedBusinessId !== null);

  const selectedBusiness = useMemo(
    () =>
      selectedBusinessId === null
        ? null
        : (businessOptions.find((option) => option.businessId === selectedBusinessId) ?? null),
    [businessOptions, selectedBusinessId]
  );

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || userId === null) {
      return;
    }

    await createMutation.mutateAsync({
      userId,
      area,
      businessId: area === "BUSINESS" ? selectedBusinessId : null,
      subject,
      message,
    });

    setSubject("");
    setMessage("");
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isVisible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={() => {}} style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalEyebrow}>{language === "fi" ? "Tuki" : "Support"}</Text>
              <Text style={styles.modalTitle}>{createTitle(area, language)}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>{language === "fi" ? "Valmis" : "Done"}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {area === "BUSINESS" ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{language === "fi" ? "Yritys" : "Business"}</Text>
                <View style={styles.optionStack}>
                  {businessOptions.map((option) => {
                    const isSelected = option.businessId === selectedBusinessId;

                    return (
                      <Pressable
                        key={option.businessId}
                        onPress={() => setSelectedBusinessId(option.businessId)}
                        style={[styles.optionCard, isSelected ? styles.optionCardSelected : null]}
                      >
                        <Text style={styles.optionTitle}>{option.businessName}</Text>
                        <Text style={styles.optionMeta}>
                          {option.city} · {option.role}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{language === "fi" ? "Aihe" : "Subject"}</Text>
              <TextInput
                autoCapitalize="sentences"
                editable={!createMutation.isPending}
                onChangeText={setSubject}
                placeholder={
                  language === "fi"
                    ? area === "BUSINESS"
                      ? "Esim. Skanneri ei avaa kameraa"
                      : "Esim. QR ei päivity"
                    : area === "BUSINESS"
                      ? "Example: Scanner does not open the camera"
                      : "Example: QR does not refresh"
                }
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                value={subject}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{language === "fi" ? "Viesti" : "Message"}</Text>
              <TextInput
                editable={!createMutation.isPending}
                multiline
                numberOfLines={6}
                onChangeText={setMessage}
                placeholder={
                  language === "fi"
                    ? "Kerro mitä tapahtui, missä näkymässä ja mitä odotit sovelluksen tekevän."
                    : "Describe what happened, where it happened, and what you expected the app to do."
                }
                placeholderTextColor={theme.colors.textDim}
                style={[styles.input, styles.messageInput]}
                textAlignVertical="top"
                value={message}
              />
            </View>

            <Pressable
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={[styles.primaryButton, !canSubmit ? styles.disabledButton : null]}
            >
              <AppIcon color={theme.colors.screenBase} name="support" size={18} />
              <Text style={styles.primaryButtonText}>
                {createMutation.isPending
                  ? language === "fi"
                    ? "Lähetetään..."
                    : "Sending..."
                  : language === "fi"
                    ? "Lähetä tukipyyntö"
                    : "Send support request"}
              </Text>
            </Pressable>

            {createMutation.error ? <Text style={styles.errorText}>{createMutation.error.message}</Text> : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{language === "fi" ? "Viimeisimmät pyynnöt" : "Latest requests"}</Text>
              {supportQuery.isLoading ? (
                <Text style={styles.metaText}>{language === "fi" ? "Ladataan..." : "Loading..."}</Text>
              ) : null}
              {supportQuery.error ? <Text style={styles.errorText}>{supportQuery.error.message}</Text> : null}
              {!supportQuery.isLoading && !supportQuery.error && supportQuery.data?.length === 0 ? (
                <Text style={styles.metaText}>{createEmptyHistory(area, language)}</Text>
              ) : null}
              {!supportQuery.isLoading && !supportQuery.error ? (
                <View style={styles.historyStack}>
                  {(supportQuery.data ?? []).map((request) => (
                    <View key={request.id} style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <Text numberOfLines={1} style={styles.historyTitle}>
                          {request.subject}
                        </Text>
                        <Text style={styles.historyStatus}>
                          {createStatusLabel(language, request.status)}
                        </Text>
                      </View>
                      <Text numberOfLines={2} style={styles.historyMessage}>
                        {request.message}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {formatDateTime(localeTag, request.createdAt)}
                        {request.businessName ? ` · ${request.businessName}` : ""}
                      </Text>
                      {request.adminReply ? (
                        <Text style={styles.historyReply}>
                          {language === "fi" ? "Tuki:" : "Support:"} {request.adminReply}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {area === "BUSINESS" && selectedBusiness === null ? (
              <Text style={styles.metaText}>
                {language === "fi"
                  ? "Tukipyyntö tarvitsee aktiivisen yritysroolin."
                  : "A support request needs an active business membership."}
              </Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    disabledButton: {
      opacity: 0.6,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    historyCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 6,
      padding: 14,
    },
    historyHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    historyMessage: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    historyMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    historyReply: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    historyStack: {
      gap: 10,
    },
    historyStatus: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    historyTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    messageInput: {
      minHeight: 132,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCloseButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderRadius: 999,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modalCloseText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    modalEyebrow: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
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
      backgroundColor: theme.colors.surfaceL1,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 16,
      maxHeight: "86%",
      paddingBottom: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    optionCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 4,
      padding: 12,
    },
    optionCardSelected: {
      borderColor: theme.colors.limeBorder,
      backgroundColor: theme.colors.limeSurface,
    },
    optionMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    optionStack: {
      gap: 8,
    },
    optionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.screenBase,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    section: {
      gap: 10,
    },
    sectionLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
  });
