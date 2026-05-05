import type { ReactElement, PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Image as ExpoImage } from "expo-image";

import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";

const darkBackgroundSource = require("../../assets/backgrounds/gravity-lines-dark.png");
const lightBackgroundSource = require("../../assets/backgrounds/gravity-lines-light.png");

type AppScreenProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
}>;

export const AppScreen = ({ children, contentContainerStyle, refreshControl }: AppScreenProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const backgroundSource = theme.mode === "dark" ? darkBackgroundSource : lightBackgroundSource;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoImage
        cachePolicy="memory-disk"
        contentFit="cover"
        pointerEvents="none"
        source={backgroundSource}
        style={styles.backgroundImage}
        transition={180}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          style={styles.scrollView}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    backgroundImage: {
      ...StyleSheet.absoluteFillObject,
      opacity: theme.mode === "dark" ? 0.26 : 0.32,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.screenBase,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      position: "relative",
    },
    content: {
      gap: theme.spacing.sectionGap,
      paddingHorizontal: theme.spacing.screenHorizontal,
      paddingTop: theme.spacing.screenVertical,
      paddingBottom: 144,
    },
  });
