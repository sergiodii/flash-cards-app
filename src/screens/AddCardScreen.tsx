import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AddWithAIModal } from "../components/AddWithAIModal";
import { useToast } from "../context/ToastContext";
import { strings } from "../i18n/strings";
import { colors, radii, spacing, typography } from "../theme/theme";

/**
 * Cards are created only through the AI flow: the user types a phrase and the
 * `generate-flashcard` edge function enriches it and writes the card. Manual
 * creation is gone, and cards are global once created.
 */
export function AddCardScreen() {
  const { showToast } = useToast();
  const [aiVisible, setAiVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.addCard.title}</Text>
      <Text style={styles.subtitle}>{strings.addCard.subtitle}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => setAiVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{strings.addCard.aiButton}</Text>
      </Pressable>

      <AddWithAIModal
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        onCreated={() => showToast(strings.addCard.aiCreated)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: typography.body * 1.4,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
