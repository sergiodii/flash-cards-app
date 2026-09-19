import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import { TextField } from "../components/TextField";
import { strings } from "../i18n/strings";
import { createFlashcard } from "../services/flashcards";
import { colors, radii, spacing, typography } from "../theme/theme";

export function AddCardScreen() {
  const [english, setEnglish] = useState("");
  const [portuguese, setPortuguese] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [example, setExample] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!english.trim() || !portuguese.trim()) {
      setError(strings.addCard.required);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createFlashcard({
        english: english.trim(),
        portuguese: portuguese.trim(),
        phonetic: phonetic.trim() || null,
        example: example.trim() || null,
        notes: notes.trim() || null,
        tags: parseTags(tags),
      });
      setEnglish("");
      setPortuguese("");
      setPhonetic("");
      setExample("");
      setNotes("");
      setTags("");
      setNotice(strings.addCard.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{strings.addCard.title}</Text>
        <Text style={styles.subtitle}>{strings.addCard.subtitle}</Text>

        <TextField
          label={strings.addCard.english}
          multiline
          onChangeText={setEnglish}
          value={english}
        />
        <TextField
          label={strings.addCard.portuguese}
          multiline
          onChangeText={setPortuguese}
          value={portuguese}
        />
        <TextField
          autoCapitalize="none"
          label={strings.addCard.phonetic}
          onChangeText={setPhonetic}
          value={phonetic}
        />
        <TextField
          label={strings.addCard.example}
          multiline
          onChangeText={setExample}
          value={example}
        />
        <TextField
          label={strings.addCard.notes}
          multiline
          onChangeText={setNotes}
          value={notes}
        />
        <TextField
          autoCapitalize="none"
          label={strings.addCard.tags}
          onChangeText={setTags}
          value={tags}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            styles.button,
            (pressed || saving) && styles.buttonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{strings.addCard.save}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** "idioms, work" -> ["idioms", "work"], trimming and dropping empties. */
function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
    marginBottom: spacing.md,
  },
  notice: {
    color: colors.success,
    fontSize: typography.caption,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
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
