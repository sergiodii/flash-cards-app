import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { strings } from "../i18n/strings";
import { generateFlashcard } from "../services/flashcards";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { Flashcard } from "../types/flashcard";
import { TextField } from "./TextField";

interface AddWithAIModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (card: Flashcard) => void;
}

/**
 * Minimal sheet that asks for a phrase and hands it to the `generate-flashcard`
 * edge function, which translates it, fills in the details and records audio.
 */
export function AddWithAIModal({
  visible,
  onClose,
  onCreated,
}: AddWithAIModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (sending) return;
    setText("");
    setError(null);
    onClose();
  };

  const onSend = async () => {
    const phrase = text.trim();
    if (!phrase) {
      setError(strings.addCard.aiInput);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const card = await generateFlashcard(phrase);
      setText("");
      onCreated(card);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{strings.addCard.aiTitle}</Text>
          <Text style={styles.subtitle}>{strings.addCard.aiSubtitle}</Text>

          <TextField
            editable={!sending}
            label={strings.addCard.aiInput}
            multiline
            onChangeText={setText}
            placeholder={strings.addCard.aiPlaceholder}
            value={text}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={sending}
            onPress={() => void onSend()}
            style={({ pressed }) => [
              styles.button,
              (pressed || sending) && styles.buttonPressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{strings.addCard.aiSend}</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={sending}
            onPress={close}
            style={({ pressed }) => [
              styles.cancel,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.cancelText}>{strings.addCard.aiCancel}</Text>
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
  cancel: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
  },
});