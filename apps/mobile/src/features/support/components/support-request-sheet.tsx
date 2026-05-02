import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useCreateSupportRequestMutation, useSupportRequestsQuery } from "@/features/support/support-requests";
import type {
  ClubSupportOption,
  BusinessSupportOption,
  SupportRequestArea,
  SupportRequestStatus,
} from "@/features/support/types";

type SupportRequestSheetProps = {
  area: SupportRequestArea;
  businessOptions: readonly BusinessSupportOption[];
  clubOptions?: readonly ClubSupportOption[];
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

  if (area === "CLUB") {
    return language === "fi" ? "Klubin tuki" : "Club support";
  }

  return language === "fi" ? "Opiskelijan tuki" : "Student support";
};

const createEmptyHistory = (area: SupportRequestArea, language: "fi" | "en"): string => {
  if (area === "BUSINESS") {
    return language === "fi"
      ? "Tukipyyntöjä ei ole vielä lähetetty tällä yritystilillä."
      : "No support requests have been sent from this business account yet.";
  }

  if (area === "CLUB") {
    return language === "fi"
      ? "Tukipyyntöjä ei ole vielä lähetetty tällä klubitilillä."
      : "No support requests have been sent from this club account yet.";
  }

  return language === "fi"
    ? "Tukipyyntöjä ei ole vielä lähetetty tällä opiskelijatilillä."
    : "No support requests have been sent from this student account yet.";
};

export const SupportRequestSheet = ({
  area,
  businessOptions,
  clubOptions = [],
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
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [isSentAnimationVisible, setIsSentAnimationVisible] = useState<boolean>(false);
  const planeTranslateY = useRef(new Animated.Value(0)).current;
  const planeTranslateX = useRef(new Animated.Value(0)).current;
  const planeScale = useRef(new Animated.Value(0.9)).current;
  const planeOpacity = useRef(new Animated.Value(0)).current;
  const sentCopyOpacity = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (area !== "CLUB") {
      setSelectedClubId(null);
      return;
    }

    const nextClubId = clubOptions[0]?.clubId ?? null;
    setSelectedClubId((currentValue) => {
      if (currentValue !== null && clubOptions.some((option) => option.clubId === currentValue)) {
        return currentValue;
      }

      return nextClubId;
    });
  }, [area, clubOptions]);

  useEffect(() => {
    if (!isVisible) {
      setIsHistoryVisible(false);
      setIsSentAnimationVisible(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isSentAnimationVisible) {
      planeTranslateY.setValue(0);
      planeTranslateX.setValue(0);
      planeScale.setValue(0.9);
      planeOpacity.setValue(0);
      sentCopyOpacity.setValue(0);
      return;
    }

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(planeOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(planeScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(sentCopyOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(planeTranslateX, {
          toValue: 72,
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(planeTranslateY, {
          toValue: -56,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(planeOpacity, {
          toValue: 0,
          duration: 720,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(sentCopyOpacity, {
        toValue: 0,
        duration: 240,
        delay: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setIsSentAnimationVisible(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [
    isSentAnimationVisible,
    planeOpacity,
    planeScale,
    planeTranslateX,
    planeTranslateY,
    sentCopyOpacity,
  ]);

  const canSubmit =
    userId !== null &&
    !createMutation.isPending &&
    subject.trim().length >= 3 &&
    message.trim().length >= 12 &&
    (area === "STUDENT" || selectedBusinessId !== null || selectedClubId !== null);

  const selectedBusiness = useMemo(
    () =>
      selectedBusinessId === null
        ? null
        : (businessOptions.find((option) => option.businessId === selectedBusinessId) ?? null),
    [businessOptions, selectedBusinessId]
  );
  const selectedClub = useMemo(
    () =>
      selectedClubId === null
        ? null
        : (clubOptions.find((option) => option.clubId === selectedClubId) ?? null),
    [clubOptions, selectedClubId]
  );

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || userId === null) {
      return;
    }

    await createMutation.mutateAsync({
      userId,
      area,
      businessId: area === "BUSINESS" ? selectedBusinessId : null,
      clubId: area === "CLUB" ? selectedClubId : null,
      subject,
      message,
    });

    setSubject("");
    setMessage("");
    setIsSentAnimationVisible(true);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isVisible}>
      <View style={styles.modalRoot}>
        <Pressable onPress={onClose} style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
          style={styles.keyboardSheetLayer}
        >
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

            <ScrollView
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={styles.modalScrollContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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

            {area === "CLUB" ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{language === "fi" ? "Klubi" : "Club"}</Text>
                <View style={styles.optionStack}>
                  {clubOptions.map((option) => {
                    const isSelected = option.clubId === selectedClubId;

                    return (
                      <Pressable
                        key={option.clubId}
                        onPress={() => setSelectedClubId(option.clubId)}
                        style={[styles.optionCard, isSelected ? styles.optionCardSelected : null]}
                      >
                        <Text style={styles.optionTitle}>{option.clubName}</Text>
                        <Text style={styles.optionMeta}>
                          {[option.city, option.role].filter(Boolean).join(" · ")}
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
                      : area === "CLUB"
                        ? "Esim. Tapahtumaa ei voi päivittää"
                      : "Esim. QR ei päivity"
                    : area === "BUSINESS"
                      ? "Example: Scanner does not open the camera"
                      : area === "CLUB"
                        ? "Example: Event cannot be updated"
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
              <AppIcon color={theme.colors.actionPrimaryText} name="support" size={18} />
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
              <Pressable onPress={() => setIsHistoryVisible(true)} style={styles.secondaryActionRow}>
                <View style={styles.secondaryActionCopy}>
                  <Text style={styles.sectionLabel}>
                    {language === "fi" ? "Viimeisimmät pyynnöt" : "Latest requests"}
                  </Text>
                  <Text style={styles.metaText}>
                    {supportQuery.data?.length
                      ? language === "fi"
                        ? `${supportQuery.data.length} viimeisintä näkyvissä`
                        : `${supportQuery.data.length} recent item(s) available`
                      : createEmptyHistory(area, language)}
                  </Text>
                </View>
                <View style={styles.secondaryActionIconWrap}>
                  <AppIcon color={theme.colors.textPrimary} name="history" size={16} />
                  <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                </View>
              </Pressable>
            </View>

            {area === "BUSINESS" && selectedBusiness === null ? (
              <Text style={styles.metaText}>
                {language === "fi"
                  ? "Tukipyyntö tarvitsee aktiivisen yritysroolin."
                  : "A support request needs an active business membership."}
              </Text>
            ) : null}
            {area === "CLUB" && selectedClub === null ? (
              <Text style={styles.metaText}>
                {language === "fi"
                  ? "Tukipyyntö tarvitsee aktiivisen klubiroolin."
                  : "A support request needs an active club membership."}
              </Text>
            ) : null}
            </ScrollView>

            {isSentAnimationVisible ? (
              <View pointerEvents="none" style={styles.sentOverlay}>
                <Animated.View
                  style={[
                    styles.sentPlane,
                    {
                      opacity: planeOpacity,
                      transform: [
                        { translateX: planeTranslateX },
                        { translateY: planeTranslateY },
                        { scale: planeScale },
                        { rotate: "-10deg" },
                      ],
                    },
                  ]}
                >
                  <AppIcon color={theme.colors.actionPrimaryText} name="send" size={22} />
                </Animated.View>
                <Animated.View style={[styles.sentBubble, { opacity: sentCopyOpacity }]}>
                  <Text style={styles.sentBubbleText}>
                    {language === "fi" ? "Pyyntö lähetetty" : "Request sent"}
                  </Text>
                </Animated.View>
              </View>
            ) : null}
          </Pressable>
        </KeyboardAvoidingView>
      </View>
      <Modal animationType="fade" onRequestClose={() => setIsHistoryVisible(false)} transparent visible={isHistoryVisible}>
        <View style={styles.historyModalRoot}>
          <Pressable onPress={() => setIsHistoryVisible(false)} style={styles.modalBackdrop} />
          <Pressable onPress={() => {}} style={styles.historyModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>{language === "fi" ? "Historia" : "History"}</Text>
                <Text style={styles.modalTitle}>{language === "fi" ? "Viimeisimmät pyynnöt" : "Latest requests"}</Text>
              </View>
              <Pressable onPress={() => setIsHistoryVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>{language === "fi" ? "Sulje" : "Close"}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.historyModalContent} showsVerticalScrollIndicator={false}>
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
                      <Text numberOfLines={3} style={styles.historyMessage}>
                        {request.message}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {formatDateTime(localeTag, request.createdAt)}
                        {request.businessName ? ` · ${request.businessName}` : ""}
                        {request.clubName ? ` · ${request.clubName}` : ""}
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
            </ScrollView>
          </Pressable>
        </View>
      </Modal>
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
    historyModalCard: {
      alignSelf: "stretch",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      marginHorizontal: 20,
      maxHeight: "72%",
      padding: 18,
    },
    historyModalContent: {
      gap: 10,
      paddingBottom: 8,
    },
    historyModalRoot: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: 24,
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
    keyboardSheetLayer: {
      flex: 1,
      justifyContent: "flex-end",
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
      ...StyleSheet.absoluteFillObject,
    },
    modalRoot: {
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
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    secondaryActionCopy: {
      flex: 1,
      gap: 4,
    },
    secondaryActionIconWrap: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    secondaryActionRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    sentBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sentBubbleText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sentOverlay: {
      alignItems: "center",
      bottom: 84,
      left: 0,
      pointerEvents: "none",
      position: "absolute",
      right: 0,
    },
    sentPlane: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 52,
      justifyContent: "center",
      marginBottom: 12,
      width: 52,
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
