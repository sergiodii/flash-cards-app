import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { filterTags, mergeTags, normalizeTag } from "../domain/tagSelection";
import { strings } from "../i18n/strings";
import { addCardTag, fetchTagOptions, removeCardTag } from "../services/tags";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { Flashcard } from "../types/flashcard";
import { TextField } from "./TextField";

interface AddTagModalProps {
  visible: boolean;
  card: Flashcard | null;
  /** The caller's private tags already on the card. */
  privateTags: string[];
  onClose: () => void;
  onChanged: (tags: string[]) => void;
}

/**
 * Tags the current card with a private (per-user) tag.
 *
 * The user can search the tags they can see (global card tags plus their own)
 * or create a new one. Toggles are optimistic: the card updates immediately and
 * rolls back if the write fails. Global tags already on the card can't be
 * removed here — only the user's own tags can.
 *
 * The content is remounted on every open (and per card), so it starts from the
 * card's current private tags without a reset effect.
 */
export function AddTagModal({
  visible,
  card,
  privateTags,
  onClose,
  onChanged,
}: AddTagModalProps) {
  if (!visible || !card) return null;

  return (
    <AddTagModalContent
      key={card.id}
      card={card}
      privateTags={privateTags}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

function AddTagModalContent({
  card,
  privateTags,
  onClose,
  onChanged,
}: {
  card: Flashcard;
  privateTags: string[];
  onClose: () => void;
  onChanged: (tags: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(privateTags);
  const [options, setOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchTagOptions()
      .then((tags) => {
        if (active) setOptions(tags);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const globalTags = card.tags;
  const matches = filterTags(options, query);
  const normalizedQuery = normalizeTag(query);
  const alreadyExists =
    normalizedQuery.length > 0 &&
    mergeTags(options, globalTags).includes(normalizedQuery);
  const canCreate = normalizedQuery.length > 0 && !alreadyExists;

  const toggle = async (tag: string) => {
    const normalized = normalizeTag(tag);
    const isOn = selected.includes(normalized);
    const next = isOn
      ? selected.filter((item) => item !== normalized)
      : mergeTags(selected, [normalized]);

    setSelected(next);
    onChanged(next);
    setBusy(true);
    setError(null);

    try {
      if (isOn) {
        await removeCardTag(card.id, normalized);
      } else {
        await addCardTag(card.id, normalized);
      }
    } catch (cause) {
      const rollback = isOn
        ? mergeTags(next, [normalized])
        : next.filter((item) => item !== normalized);
      setSelected(rollback);
      onChanged(rollback);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    const tag = normalizeTag(query);
    if (!tag) return;
    setQuery("");
    void toggle(tag);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{strings.tagModal.title}</Text>

          <TextField
            label={strings.tagModal.search}
            onChangeText={setQuery}
            placeholder={strings.tagModal.searchPlaceholder}
            value={query}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {loadingOptions ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {matches.length === 0 && !canCreate ? (
                <Text style={styles.empty}>{strings.tagModal.noResults}</Text>
              ) : (
                matches.map((tag) => {
                  const onCard = globalTags.includes(tag);
                  const isOn = selected.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isOn, disabled: onCard }}
                      disabled={onCard || busy}
                      onPress={() => void toggle(tag)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.rowLabel, onCard && styles.rowLabelMuted]}
                      >
                        {tag}
                      </Text>
                      <Text style={styles.rowState}>
                        {onCard ? strings.tagModal.onCard : isOn ? "✓" : ""}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}

          {canCreate ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={create}
              style={({ pressed }) => [
                styles.create,
                (pressed || busy) && styles.pressed,
              ]}
            >
              <Text style={styles.createText}>
                {strings.tagModal.create(query.trim())}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}
          >
            <Text style={styles.doneText}>{strings.tagModal.done}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  loading: {
    marginVertical: spacing.lg,
  },
  list: {
    maxHeight: 280,
    marginBottom: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    flexShrink: 1,
  },
  rowLabelMuted: {
    color: colors.textMuted,
  },
  rowState: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  create: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  createText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "700",
  },
  done: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneText: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
  },
});