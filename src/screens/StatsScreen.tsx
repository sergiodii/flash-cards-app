import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useStudyPreferences } from "../context/StudyPreferencesContext";
import { strings } from "../i18n/strings";
import { fetchFlashcardStats } from "../services/flashcards";
import { colors, radii, spacing, typography } from "../theme/theme";
import {
  accuracy,
  EMPTY_STATS,
  type FlashcardStats,
  type FlashcardStatsCounts,
  type TagStats,
} from "../types/stats";

export function StatsScreen() {
  const { onlyMine } = useStudyPreferences();
  const [stats, setStats] = useState<FlashcardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchFlashcardStats(onlyMine));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [onlyMine]);

  // Refresh every time the screen gains focus so the numbers stay current
  // after a study session.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateBody}>{strings.stats.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.stateTitle}>{strings.stats.errorTitle}</Text>
        <Text style={styles.stateBody}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void load()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{strings.stats.retry}</Text>
        </Pressable>
      </View>
    );
  }

  const { totals } = stats;

  if (totals.seenCount === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.stateTitle}>{strings.stats.emptyTitle}</Text>
        <Text style={styles.stateBody}>{strings.stats.emptyBody}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summary}>
        <Summary
          label={strings.stats.total}
          value={String(totals.total)}
          color={colors.text}
        />
        <Summary
          label={strings.stats.reviews}
          value={String(totals.leftCount + totals.rightCount)}
          color={colors.accent}
        />
        <Summary
          label={strings.stats.accuracy}
          value={formatAccuracy(totals)}
          color={colors.warning}
        />
      </View>

      <View style={styles.buckets}>
        <Bucket
          label={strings.stats.learned}
          value={totals.learnedCount}
          color={colors.success}
        />
        <Bucket
          label={strings.stats.struggling}
          value={totals.strugglingCount}
          color={colors.danger}
        />
        <Bucket
          label={strings.stats.fresh}
          value={totals.newCount}
          color={colors.textMuted}
        />
        <Bucket
          label={strings.stats.neutral}
          value={totals.neutralCount}
          color={colors.warning}
        />
      </View>

      <Text style={styles.sectionTitle}>{strings.stats.byTag}</Text>
      {stats.tags.length === 0 ? (
        <Text style={styles.stateBody}>{strings.stats.noTags}</Text>
      ) : (
        stats.tags.map((tag) => <TagRow key={tag.tag} tag={tag} />)
      )}
    </ScrollView>
  );
}

function formatAccuracy(counts: FlashcardStatsCounts): string {
  return `${Math.round(accuracy(counts) * 100)}%`;
}

function Summary({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Bucket({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.bucket, { borderColor: color }]}>
      <Text style={[styles.bucketValue, { color }]}>{value}</Text>
      <Text style={styles.bucketLabel}>{label}</Text>
    </View>
  );
}

function TagRow({ tag }: { tag: TagStats }) {
  return (
    <View style={styles.tagRow}>
      <View style={styles.tagHeader}>
        <Text style={styles.tagName} numberOfLines={1}>
          {tag.tag}
        </Text>
        <Text style={styles.tagTotal}>
          {tag.total} · {formatAccuracy(tag)}
        </Text>
      </View>
      <View style={styles.tagBars}>
        <Text style={[styles.tagStat, { color: colors.success }]}>
          {strings.stats.learned} {tag.learnedCount}
        </Text>
        <Text style={[styles.tagStat, { color: colors.danger }]}>
          {strings.stats.struggling} {tag.strugglingCount}
        </Text>
        <Text style={[styles.tagStat, { color: colors.textMuted }]}>
          {strings.stats.fresh} {tag.newCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
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
  summary: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: typography.subtitle,
    fontWeight: "800",
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  buckets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bucket: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  bucketValue: {
    fontSize: typography.subtitle,
    fontWeight: "800",
  },
  bucketLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  tagRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tagHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tagName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    flexShrink: 1,
  },
  tagTotal: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  tagBars: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  tagStat: {
    fontSize: typography.caption,
    fontWeight: "600",
  },
  retry: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
  },
});
