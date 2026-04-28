import { StyleSheet, Text, View } from "react-native";

import { SymbolView } from "expo-symbols";

import { mobileTheme } from "@/features/foundation/theme";

export const LoginHero = () => (
  <View style={styles.container}>
    <Text style={styles.kicker}>OmaLeima</Text>
    <Text style={styles.title}>Digital leima nights with a livelier, safer event flow.</Text>
    <Text style={styles.subtitle}>
      Students jump in with Google, venues scan live QR codes, and organizers keep the whole appro night readable without paper cards.
    </Text>
    <View style={styles.pillRow}>
      <View style={styles.pill}>
        <SymbolView
          name={{ android: "event", ios: "sparkles.rectangle.stack.fill", web: "event" }}
          size={15}
          tintColor={mobileTheme.colors.accentBlue}
        />
        <Text style={styles.pillText}>Live events</Text>
      </View>
      <View style={styles.pill}>
        <SymbolView
          name={{ android: "qr_code_scanner", ios: "qrcode.viewfinder", web: "qr_code_scanner" }}
          size={15}
          tintColor={mobileTheme.colors.accentMint}
        />
        <Text style={styles.pillText}>Rolling QR</Text>
      </View>
      <View style={styles.pill}>
        <SymbolView
          name={{ android: "redeem", ios: "gift.fill", web: "redeem" }}
          size={15}
          tintColor={mobileTheme.colors.accentGold}
        />
        <Text style={styles.pillText}>Rewards</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  kicker: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  subtitle: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 460,
  },
  pill: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pillText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
