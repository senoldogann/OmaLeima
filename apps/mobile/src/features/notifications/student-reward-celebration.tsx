import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { getEventCoverSourceWithFallback, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import type { StudentRewardCelebrationCandidate } from "@/features/notifications/student-reward-notification-model";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type StudentRewardCelebrationContextValue = {
  triggerRewardCelebration: (candidates: StudentRewardCelebrationCandidate[]) => void;
};

const StudentRewardCelebrationContext =
  createContext<StudentRewardCelebrationContextValue | null>(null);

const createCelebrationTitle = (
  candidates: StudentRewardCelebrationCandidate[],
  language: "fi" | "en"
): string => {
  const [firstCandidate] = candidates;

  if (typeof firstCandidate === "undefined") {
    return language === "fi" ? "Leima saatu" : "Leima earned";
  }

  if (firstCandidate.kind === "STAMP") {
    if (language === "fi") {
      return candidates.length === 1 ? "Leima saatu" : `${candidates.length} leimaa saatu`;
    }

    return candidates.length === 1 ? "Leima earned" : `${candidates.length} leimas earned`;
  }

  if (language === "fi") {
    return candidates.length === 1
      ? "Palkinto avautui"
      : `${candidates.length} palkintoa avautui`;
  }

  return candidates.length === 1 ? "Reward unlocked" : `${candidates.length} rewards unlocked`;
};

const createCelebrationBody = (
  candidates: StudentRewardCelebrationCandidate[],
  language: "fi" | "en"
): string => {
  const [firstCandidate] = candidates;

  if (typeof firstCandidate === "undefined") {
    return language === "fi"
      ? "Uusi leima lisättiin tapahtumapassiisi."
      : "A new leima was added to your event pass.";
  }

  if (firstCandidate.kind === "STAMP") {
    return language === "fi"
      ? `Uusi leima kirjattiin tapahtumassa ${firstCandidate.eventName}.`
      : `A new leima was recorded in ${firstCandidate.eventName}.`;
  }

  if (candidates.length === 1) {
    return language === "fi"
      ? `${firstCandidate.tierTitle} on nyt valmiina tapahtumassa ${firstCandidate.eventName}.`
      : `${firstCandidate.tierTitle} is ready in ${firstCandidate.eventName}.`;
  }

  return language === "fi"
    ? `${firstCandidate.tierTitle} ja ${candidates.length - 1} muuta palkintoa ovat nyt valmiina.`
    : `${firstCandidate.tierTitle} and ${candidates.length - 1} more rewards are now ready.`;
};

const createCelebrationStampLabel = (candidates: StudentRewardCelebrationCandidate[]): string => {
  const [firstCandidate] = candidates;

  if (typeof firstCandidate === "undefined") {
    return "LEIMA";
  }

  if (firstCandidate.kind === "STAMP") {
    return "LEIMA";
  }

  return firstCandidate.tierTitle.trim().slice(0, 16).toUpperCase();
};

const createTicketTitle = (
  candidate: StudentRewardCelebrationCandidate | null,
  language: "fi" | "en"
): string => {
  if (candidate === null) {
    return language === "fi" ? "Leima lisätty" : "Leima added";
  }

  if (candidate.kind === "STAMP") {
    return language === "fi"
      ? `${candidate.stampCount} leimaa yhteensä`
      : `${candidate.stampCount} total leimas`;
  }

  return candidate.tierTitle;
};

const createTicketHint = (
  candidate: StudentRewardCelebrationCandidate | null,
  language: "fi" | "en"
): string => {
  if (candidate === null) {
    return language === "fi"
      ? "Passisi pysyy ajan tasalla koko illan."
      : "Your pass keeps the latest progress live.";
  }

  if (candidate.kind === "STAMP") {
    return language === "fi"
      ? "Tapahtumapassisi päivittyi heti."
      : "Your event pass updated instantly.";
  }

  return language === "fi"
    ? "Näytä tämä tiskillä, kun lunastat palkinnon."
    : "Show this at the venue when you claim it.";
};

export const StudentRewardCelebrationProvider = ({ children }: PropsWithChildren) => {
  const { language, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [activeCandidates, setActiveCandidates] = useState<StudentRewardCelebrationCandidate[] | null>(
    null
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(34)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(1.5)).current;
  const stampRotate = useRef(new Animated.Value(-16)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  const clearDismissTimeout = useCallback((): void => {
    if (timeoutRef.current === null) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const hideCelebration = useCallback((): void => {
    clearDismissTimeout();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 28,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.96,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(stampOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setActiveCandidates(null);
      }
    });
  }, [
    backdropOpacity,
    cardScale,
    cardTranslateY,
    clearDismissTimeout,
    stampOpacity,
  ]);

  const triggerRewardCelebration = useCallback(
    (candidates: StudentRewardCelebrationCandidate[]): void => {
      if (candidates.length === 0) {
        return;
      }

      clearDismissTimeout();
      setActiveCandidates(candidates);

      backdropOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
      cardScale.stopAnimation();
      stampOpacity.stopAnimation();
      stampScale.stopAnimation();
      stampRotate.stopAnimation();
      shimmerOpacity.stopAnimation();

      backdropOpacity.setValue(0);
      cardTranslateY.setValue(34);
      cardScale.setValue(0.94);
      stampOpacity.setValue(0);
      stampScale.setValue(1.5);
      stampRotate.setValue(-16);
      shimmerOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          mass: 0.86,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(140),
          Animated.parallel([
            Animated.timing(stampOpacity, {
              toValue: 1,
              duration: 110,
              useNativeDriver: true,
            }),
            Animated.spring(stampScale, {
              toValue: 1,
              damping: 10,
              stiffness: 190,
              mass: 0.72,
              useNativeDriver: true,
            }),
            Animated.spring(stampRotate, {
              toValue: -7,
              damping: 12,
              stiffness: 170,
              mass: 0.82,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.timing(shimmerOpacity, {
            toValue: 0.16,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerOpacity, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        hideCelebration();
      }, 2600);
    },
    [
      backdropOpacity,
      cardScale,
      cardTranslateY,
      clearDismissTimeout,
      hideCelebration,
      shimmerOpacity,
      stampOpacity,
      stampRotate,
      stampScale,
    ]
  );

  useEffect(() => () => clearDismissTimeout(), [clearDismissTimeout]);

  const contextValue = useMemo<StudentRewardCelebrationContextValue>(
    () => ({ triggerRewardCelebration }),
    [triggerRewardCelebration]
  );

  const heroCandidate = activeCandidates?.[0] ?? null;
  const coverSource =
    heroCandidate === null
      ? null
      : getEventCoverSourceWithFallback(
          heroCandidate.coverImageUrl,
          "rewardCelebration"
        );

  useEffect(() => {
    void prefetchEventCoverUrls([heroCandidate?.coverImageUrl ?? null]);
  }, [heroCandidate?.coverImageUrl]);

  return (
    <StudentRewardCelebrationContext.Provider value={contextValue}>
      {children}
      <Modal
        animationType="none"
        onRequestClose={hideCelebration}
        transparent
        visible={activeCandidates !== null}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable onPress={hideCelebration} style={styles.backdropPressable}>
            <Animated.View
              style={[
                styles.cardWrap,
                {
                  transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
                },
              ]}
            >
              <CoverImageSurface
                imageStyle={styles.heroImage}
                source={coverSource ?? getEventCoverSourceWithFallback(null, "rewardCelebration")}
                style={styles.card}
              >
                <View style={styles.cardOverlay} />
                <Animated.View style={[styles.shimmer, { opacity: shimmerOpacity }]} />

                <View style={styles.content}>
                  <Text style={styles.eyebrow}>
                    {heroCandidate?.kind === "STAMP"
                      ? language === "fi"
                        ? "Leima saatu"
                        : "Leima earned"
                      : language === "fi"
                        ? "Palkinto avautui"
                        : "Reward unlocked"}
                  </Text>
                  <Text style={styles.title}>
                    {createCelebrationTitle(activeCandidates ?? [], language)}
                  </Text>
                  <Text style={styles.body}>
                    {createCelebrationBody(activeCandidates ?? [], language)}
                  </Text>

                  <View style={styles.ticket}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketEvent}>
                        {heroCandidate?.eventName ??
                          (language === "fi" ? "OmaLeima-ilta" : "OmaLeima night")}
                      </Text>
                      <View style={styles.ticketIcon}>
                        <AppIcon color={theme.colors.lime} name="calendar" size={16} />
                      </View>
                    </View>
                    <Text style={styles.ticketReward}>
                      {createTicketTitle(heroCandidate, language)}
                    </Text>
                    <Text style={styles.ticketHint}>
                      {createTicketHint(heroCandidate, language)}
                    </Text>
                  </View>

                  <Animated.View
                    style={[
                      styles.stampSeal,
                      {
                        opacity: stampOpacity,
                        transform: [
                          {
                            rotate: stampRotate.interpolate({
                              inputRange: [-20, 20],
                              outputRange: ["-20deg", "20deg"],
                            }),
                          },
                          { scale: stampScale },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.stampSealEyebrow}>LEIMA</Text>
                    <Text numberOfLines={1} style={styles.stampSealTitle}>
                      {createCelebrationStampLabel(activeCandidates ?? [])}
                    </Text>
                  </Animated.View>
                </View>
              </CoverImageSurface>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </StudentRewardCelebrationContext.Provider>
  );
};

export const useStudentRewardCelebration = (): StudentRewardCelebrationContextValue => {
  const context = useContext(StudentRewardCelebrationContext);

  if (context === null) {
    throw new Error("useStudentRewardCelebration must be used inside StudentRewardCelebrationProvider.");
  }

  return context;
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    backdrop: {
      alignItems: "center",
      backgroundColor: theme.mode === "light" ? "rgba(10, 16, 10, 0.5)" : "rgba(0, 0, 0, 0.72)",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    backdropPressable: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      width: "100%",
    },
    body: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 280,
    },
    card: {
      borderRadius: 24,
      minHeight: 420,
      overflow: "hidden",
      padding: 24,
      width: "100%",
    },
    cardOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "light" ? "rgba(9, 14, 9, 0.36)" : "rgba(0, 0, 0, 0.54)",
    },
    cardWrap: {
      maxWidth: 380,
      width: "100%",
    },
    content: {
      flex: 1,
      gap: 14,
      justifyContent: "flex-end",
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
      zIndex: 2,
    },
    heroImage: {
      borderRadius: 24,
    },
    shimmer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.limeSurface,
    },
    stampSeal: {
      alignItems: "center",
      alignSelf: "flex-end",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderStyle: "dashed",
      borderWidth: 2,
      bottom: 28,
      height: 140,
      justifyContent: "center",
      paddingHorizontal: 18,
      position: "absolute",
      right: 18,
      width: 140,
    },
    stampSealEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    stampSealTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      marginTop: 4,
      textAlign: "center",
    },
    ticket: {
      backgroundColor: theme.mode === "light" ? "rgba(245, 250, 243, 0.9)" : "rgba(6, 8, 6, 0.88)",
      borderColor: theme.colors.limeBorder,
      borderRadius: 18,
      borderWidth: 1,
      gap: 8,
      marginTop: 6,
      padding: 18,
      zIndex: 2,
    },
    ticketEvent: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    ticketHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    ticketHint: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    ticketIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    ticketReward: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
      maxWidth: 220,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 36,
      letterSpacing: -0.9,
      lineHeight: 42,
      maxWidth: 300,
      zIndex: 2,
    },
  });
