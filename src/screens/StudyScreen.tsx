import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddTagModal } from "../components/AddTagModal";
import { CardDetailModal } from "../components/CardDetailModal";
import { SwipeDeck } from "../components/SwipeDeck";
import { useStudyQueue } from "../hooks/useStudyQueue";
import { strings } from "../i18n/strings";
import { colors, radii, spacing, typography } from "../theme/theme";

export function StudyScreen() {
  const insets = useSafeAreaInsets();
  const [tagVisible, setTagVisible] = useState(false);
  const {
    current,
    next,
    loading,
    error,
    stats,
    progress,
    privateTags,
    pending,
    commit,
    dismiss,
    reload,
    setCardTags,
  } = useStudyQueue();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{strings.study.session}</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!current}
            onPress={() => setTagVisible(true)}
            style={({ pressed }) => [
              styles.tagButton,
              (pressed || !current) && styles.tagButtonPressed,
            ]}
          >
            <Text style={styles.tagButtonText}>{strings.study.addTag}</Text>
          </Pressable>
          <View style={styles.stats}>
            <StatPill value={stats.left} color={colors.danger} />
            <StatPill value={stats.right} color={colors.success} />
          </View>
        </View>
      </View>

      <View style={styles.deckArea}>{renderContent()}</View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.hint}>← {strings.swipe.hintLeft}</Text>
        <Text style={styles.hint}>{strings.swipe.hintRight} →</Text>
      </View>

      <CardDetailModal
        visible={pending !== null}
        card={pending?.card ?? null}
        direction={pending?.direction ?? null}
        progress={pending ? progress[pending.card.id] ?? null : null}
        onClose={dismiss}
      />

      <AddTagModal
        visible={tagVisible}
        card={current}
        privateTags={current ? privateTags[current.id] ?? [] : []}
        onClose={() => setTagVisible(false)}
        onChanged={(tags) => {
          if (current) setCardTags(current.id, tags);
        }}
      />
    </View>
  );

  function renderContent() {
    if (loading && !current) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      );
    }

    if (error && !current) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>{strings.study.errorTitle}</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={reload}
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.retryPressed,
            ]}
          >
            <Text style={styles.retryText}>{strings.study.retry}</Text>
          </Pressable>
        </View>
      );
    }

    if (!current) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>{strings.study.emptyTitle}</Text>
          <Text style={styles.stateBody}>{strings.study.emptyBody}</Text>
        </View>
      );
    }

    return (
      <SwipeDeck
        key={current.id}
        card={current}
        nextCard={next}
        progress={progress[current.id] ?? null}
        nextProgress={next ? progress[next.id] ?? null : null}
        privateTags={privateTags[current.id] ?? []}
        nextPrivateTags={next ? privateTags[next.id] ?? [] : []}
        onCommit={commit}
      />
    );
  }
}

function StatPill({ value, color }: { value: number; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tagButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tagButtonPressed: {
    opacity: 0.6,
  },
  tagButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  pill: {
    minWidth: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "800",
  },
  deckArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
    textAlign: "center",
  },
  stateBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: typography.body * 1.4,
  },
  retry: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    flexShrink: 1,
  },
});
