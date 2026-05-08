import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type BusinessOnboardingModalProps = {
  isVisible: boolean;
  onDismiss: () => void;
};

type BusinessOnboardingSlide = {
  body: string;
  eyebrow: string;
  imageSource: ImageSourcePropType;
  title: string;
};

const imageSources = {
  queue: require("../../../../assets/event-covers/bar-friends.jpg") as ImageSourcePropType,
  qr: require("../../../../assets/event-covers/omaleima-qr-checkpoint.png") as ImageSourcePropType,
  tools: require("../../../../assets/event-covers/omaleima-leima-pass.png") as ImageSourcePropType,
} as const;

const createSlides = (language: "fi" | "en"): readonly BusinessOnboardingSlide[] => {
  if (language === "fi") {
    return [
      {
        body: "Kun tapahtuma on käynnissä, avaa skanneri ja valitse oikea tapahtuma ennen QR:n lukemista.",
        eyebrow: "1 / 3",
        imageSource: imageSources.qr,
        title: "Skannaa oikeaan tapahtumaan",
      },
      {
        body: "Live-, tulevat ja päättyneet tapahtumat löytyvät yhdestä paikasta. Historia auttaa selvittämään ruuhkaiset illat myöhemmin.",
        eyebrow: "2 / 3",
        imageSource: imageSources.queue,
        title: "Pidä jono liikkeessä",
      },
      {
        body: "Profiilista päivität Y-tunnuksen, vastuuhenkilön, aukioloajat, skannerilaitteet, tuen ja tämän ohjeen uudelleen.",
        eyebrow: "3 / 3",
        imageSource: imageSources.tools,
        title: "Hallitse yritystä rauhassa",
      },
    ];
  }

  return [
    {
      body: "When an event is live, open the scanner and choose the right event before reading a student's QR.",
      eyebrow: "1 / 3",
      imageSource: imageSources.qr,
      title: "Scan into the right event",
    },
    {
      body: "Live, upcoming, and completed events stay in one place. History helps you review busy nights afterwards.",
      eyebrow: "2 / 3",
      imageSource: imageSources.queue,
      title: "Keep the queue moving",
    },
    {
      body: "From Profile you can update Y-tunnus, responsible person, opening hours, scanner devices, support, and reopen this guide.",
      eyebrow: "3 / 3",
      imageSource: imageSources.tools,
      title: "Manage the venue calmly",
    },
  ];
};

const readActiveSlide = (
  slides: readonly BusinessOnboardingSlide[],
  activeIndex: number
): BusinessOnboardingSlide => {
  const activeSlide = slides[activeIndex] ?? slides[0];

  if (activeSlide === undefined) {
    throw new Error("Business onboarding slides must not be empty.");
  }

  return activeSlide;
};

export const BusinessOnboardingModal = ({ isVisible, onDismiss }: BusinessOnboardingModalProps) => {
  const { width } = useWindowDimensions();
  const { language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const slides = useMemo(() => createSlides(language), [language]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const activeSlide = readActiveSlide(slides, activeIndex);
  const isLastSlide = activeIndex === slides.length - 1;
  const imageHeight = Math.max(188, Math.min(260, width * 0.58));

  const handleDismissPress = (): void => {
    setActiveIndex(0);
    onDismiss();
  };

  const handlePrimaryPress = (): void => {
    if (isLastSlide) {
      handleDismissPress();
      return;
    }

    setActiveIndex((currentIndex) => Math.min(currentIndex + 1, slides.length - 1));
  };

  return (
    <Modal animationType="fade" onRequestClose={handleDismissPress} transparent visible={isVisible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <CoverImageSurface
            fallbackSource={activeSlide.imageSource}
            imageStyle={styles.heroImage}
            source={activeSlide.imageSource}
            style={[styles.hero, { height: imageHeight }]}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroTopRow}>
              <Text style={styles.eyebrow}>{activeSlide.eyebrow}</Text>
              <Pressable
                accessibilityLabel={language === "fi" ? "Sulje opastus" : "Close onboarding"}
                onPress={handleDismissPress}
                style={styles.closeButton}
              >
                <AppIcon color="#FFFFFF" name="x" size={16} />
              </Pressable>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>{activeSlide.title}</Text>
              <Text style={styles.body}>{activeSlide.body}</Text>
            </View>
          </CoverImageSurface>

          <View style={styles.footer}>
            <View style={styles.dotRow}>
              {slides.map((slide, index) => (
                <View
                  key={slide.eyebrow}
                  style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
                />
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                disabled={activeIndex === 0}
                onPress={() => setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
                style={[styles.secondaryButton, activeIndex === 0 ? styles.disabledButton : null]}
              >
                <Text style={styles.secondaryButtonText}>{language === "fi" ? "Takaisin" : "Back"}</Text>
              </Pressable>
              <Pressable onPress={handlePrimaryPress} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {isLastSlide
                    ? language === "fi"
                      ? "Aloita"
                      : "Start"
                    : language === "fi"
                      ? "Seuraava"
                      : "Next"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>
              {language === "fi"
                ? "Voit avata tämän myöhemmin yritysprofiilista."
                : "You can reopen this later from the business profile."}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    backdrop: {
      alignItems: "center",
      backgroundColor: theme.mode === "dark" ? "rgba(0,0,0,0.72)" : "rgba(18,22,16,0.34)",
      flex: 1,
      justifyContent: "center",
      padding: 18,
    },
    body: {
      color: "rgba(255,255,255,0.82)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    card: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.scene,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 0,
      maxWidth: 420,
      overflow: "hidden",
      width: "100%",
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.34)",
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    disabledButton: {
      opacity: 0.44,
    },
    dot: {
      backgroundColor: theme.colors.borderStrong,
      borderRadius: 999,
      height: 8,
      width: 8,
    },
    dotActive: {
      backgroundColor: theme.colors.lime,
      width: 26,
    },
    dotRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    footer: {
      gap: 14,
      padding: 16,
    },
    hero: {
      overflow: "hidden",
      position: "relative",
    },
    heroCopy: {
      bottom: 18,
      gap: 8,
      left: 18,
      position: "absolute",
      right: 18,
    },
    heroImage: {
      borderTopLeftRadius: theme.radius.scene,
      borderTopRightRadius: theme.radius.scene,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.46)",
    },
    heroTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      left: 16,
      position: "absolute",
      right: 16,
      top: 16,
    },
    hint: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flex: 1,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      flex: 1,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    title: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      letterSpacing: -0.6,
      lineHeight: theme.typography.lineHeights.title,
    },
  });
