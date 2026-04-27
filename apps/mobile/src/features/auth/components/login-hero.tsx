import { StyleSheet, Text, View } from "react-native";

export const LoginHero = () => (
  <View style={styles.container}>
    <Text style={styles.kicker}>OmaLeima</Text>
    <Text style={styles.title}>Digital leima pass for Finnish student overalls events.</Text>
    <Text style={styles.subtitle}>
      Expo shell, Supabase session bootstrap, and push preparation are ready. Google sign-in lands in the next slice.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  kicker: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
});
