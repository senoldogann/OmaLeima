import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
}>;

export const InfoCard = ({ children, title, eyebrow }: InfoCardProps) => (
  <View style={styles.card}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.title}>{title}</Text>
    <View style={styles.body}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    gap: 10,
  },
  eyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    gap: 10,
  },
});
