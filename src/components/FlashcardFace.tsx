import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { strings } from "../i18n/strings";
import { colors, radii, shadow, spacing, typography } from "../theme/theme";
import type { Flashcard } from "../types/flashcard";

interface FlashcardFaceProps {
  card: Flashcard;
}

/** The visible face of a card: the English phrase plus its metadata. */
export function FlashcardFace({ card }: FlashcardFaceProps) {
  return (
    <LinearGradient
      colors={[colors.surfaceElevated, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.tags}>
          {card.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.seen}>{strings.card.seen(card.seenCount)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.english}>{card.english}</Text>
      </View>

      <Text style={styles.hint}>{strings.card.tapHint}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: "space-between",
    ...shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    flexShrink: 1,
  },
  tag: {
    backgroundColor: colors.accent + "33",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  seen: {
    color: colors.textMuted,
    fontSize: 12,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  english: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: typography.title * 1.25,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: "center",
  },
});
