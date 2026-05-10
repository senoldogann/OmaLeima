import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import type { AppLanguage } from "@/features/i18n/translations";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type LanguageDropdownProps = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => Promise<void>;
};

type LanguageOption = {
  label: string;
  value: AppLanguage;
};

const createLanguageOptions = (language: AppLanguage): LanguageOption[] => [
  {
    label: language === "fi" ? "Suomi" : "Finnish",
    value: "fi",
  },
  {
    label: language === "fi" ? "Englanti" : "English",
    value: "en",
  },
];

export const LanguageDropdown = ({ language, onLanguageChange }: LanguageDropdownProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const options = createLanguageOptions(language);
  const selectedOption = options.find((option) => option.value === language);
  const selectedLabel = selectedOption?.label ?? language.toUpperCase();
  const dropdownLabel = language === "fi" ? "Kieli" : "Language";

  const handleOptionPress = (nextLanguage: AppLanguage): void => {
    setIsOpen(false);

    if (nextLanguage === language) {
      return;
    }

    void onLanguageChange(nextLanguage);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((currentValue) => !currentValue)}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
      >
        <View style={styles.labelRow}>
          <View style={styles.iconBubble}>
            <AppIcon color={theme.colors.lime} name="globe" size={18} />
          </View>
          <View style={styles.labelCopy}>
            <Text style={styles.labelText}>{dropdownLabel}</Text>
            <Text style={styles.helperText}>
              {language === "fi" ? "Sovelluksen kieli" : "App language"}
            </Text>
          </View>
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>{selectedLabel}</Text>
          <AppIcon color={theme.colors.textMuted} name="chevron-down" size={16} />
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const isSelected = option.value === language;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleOptionPress(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected ? styles.optionSelected : null,
                  pressed ? styles.optionPressed : null,
                ]}
              >
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                  {option.label}
                </Text>
                {isSelected ? <AppIcon color={theme.colors.actionPrimaryText} name="check" size={15} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      minHeight: 56,
      paddingVertical: 6,
    },
    buttonPressed: {
      opacity: 0.82,
    },
    container: {
      gap: 8,
      position: "relative",
      width: "100%",
    },
    labelRow: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 1,
      gap: 12,
      minWidth: 0,
    },
    iconBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    labelCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    labelText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    menu: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 6,
      padding: 6,
    },
    option: {
      alignItems: "center",
      borderRadius: theme.radius.button,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    optionPressed: {
      opacity: 0.78,
    },
    optionSelected: {
      backgroundColor: theme.colors.lime,
    },
    optionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    optionTextSelected: {
      color: theme.colors.actionPrimaryText,
    },
    valueRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    valueText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
