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

import { TagToggleRow } from "../components/TagToggleRow";
import { useStudyPreferences } from "../context/StudyPreferencesContext";
import { strings } from "../i18n/strings";
import { fetchFlashcardStats } from "../services/flashcards";
import { colors, radii, spacing, typography } from "../theme/theme";

export function SettingsScreen() {
  const {
    selectedTags,
    saving,
    error: saveError,
    toggle,
    isSelected,
  } = useStudyPreferences();

  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await fetchFlashcardStats();
      setTags(stats.tags.map((tag) => tag.tag));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on focus so newly tagged cards show up without an app restart.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateBody}>{strings.settings.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.stateTitle}>{strings.settings.errorTitle}</Text>
        <Text style={styles.stateBody}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void load()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{strings.settings.retry}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{strings.settings.title}</Text>
      <Text style={styles.subtitle}>{strings.settings.subtitle}</Text>

      {tags.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.stateTitle}>{strings.settings.emptyTitle}</Text>
          <Text style={styles.stateBody}>{strings.settings.emptyBody}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {tags.map((tag) => (
            <TagToggleRow
              key={tag}
              label={tag}
              onToggle={() => toggle(tag)}
              value={isSelected(tag)}
            />
          ))}
        </View>
      )}

      <Text style={styles.selection}>
        {selectedTags.length === 0
          ? strings.settings.allCards
          : strings.settings.selectedCount(selectedTags.length)}
      </Text>

      {saveError ? (
        <Text style={styles.error}>{strings.settings.saveError}</Text>
      ) : null}
      {saving ? (
        <ActivityIndicator color={colors.accent} style={styles.saving} />
      ) : null}
    </ScrollView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
  selection: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    marginTop: spacing.md,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  saving: {
    marginTop: spacing.sm,
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
