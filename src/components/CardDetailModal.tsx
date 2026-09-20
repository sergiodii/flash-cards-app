import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { strings } from "../i18n/strings";
import { colors, radii, spacing, typography } from "../theme/theme";
import type {
  Flashcard,
  FlashcardProgress,
  SwipeDirection,
} from "../types/flashcard";

interface CardDetailModalProps {
  visible: boolean;
  card: Flashcard | null;
  direction: SwipeDirection | null;
  progress?: FlashcardProgress | null;
  onClose: () => void;
}

/** Explains the card that was just swiped: translation, phonetics and example. */
export function CardDetailModal({
  visible,
  card,
  direction,
  progress,
  onClose,
}: CardDetailModalProps) {
  if (!card) {
    return null;
  }

  const isKnown = direction === "right";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View
            style={[
              styles.status,
              isKnown ? styles.statusKnown : styles.statusReview,
            ]}
          >
            <Text style={styles.statusText}>
              {isKnown ? strings.swipe.know : strings.swipe.review}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.english}>{card.english}</Text>

            {card.phonetic ? (
              <Text style={styles.phonetic}>{card.phonetic}</Text>
            ) : null}

            <Section title={strings.details.translation}>
              <Text style={styles.value}>{card.portuguese}</Text>
            </Section>

            {card.example ? (
              <Section title={strings.details.example}>
                <Text style={[styles.value, styles.example]}>
                  “{card.example}”
                </Text>
              </Section>
            ) : null}

            {card.notes ? (
              <Section title={strings.details.notes}>
                <Text style={styles.value}>{card.notes}</Text>
              </Section>
            ) : null}

            {card.tags.length > 0 ? (
              <Section title={strings.details.tags}>
                <View style={styles.tags}>
                  {card.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            <View style={styles.counters}>
              <Counter
                label={strings.details.reviewCount}
                value={progress?.leftCount ?? 0}
                color={colors.danger}
              />
              <Counter
                label={strings.details.knowCount}
                value={progress?.rightCount ?? 0}
                color={colors.success}
              />
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{strings.details.continue}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Counter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.counter}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  statusKnown: {
    backgroundColor: colors.success + "33",
  },
  statusReview: {
    backgroundColor: colors.danger + "33",
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  english: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  phonetic: {
    color: colors.accent,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.body * 1.4,
  },
  example: {
    fontStyle: "italic",
    color: colors.text,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
  counters: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  counter: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  counterValue: {
    fontSize: typography.subtitle,
    fontWeight: "800",
  },
  counterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
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
