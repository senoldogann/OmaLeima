import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});
