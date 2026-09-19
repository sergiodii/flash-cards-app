import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useToast } from "../context/ToastContext";
import { strings } from "../i18n/strings";
import { getAudioSignedUrl } from "../services/storage";
import { colors, radii, spacing, typography } from "../theme/theme";

interface AudioButtonProps {
  audioPath: string;
}

/**
 * Plays the English narration of a card.
 *
 * The bucket is private, so the signed URL is fetched lazily on the first tap
 * and cached per path; once loaded the same player toggles play/stop.
 */
export function AudioButton({ audioPath }: AudioButtonProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const onPress = async () => {
    try {
      if (status.playing) {
        player.pause();
        void player.seekTo(0);
        return;
      }

      if (loadedPath !== audioPath) {
        setLoading(true);
        const url = await getAudioSignedUrl(audioPath);
        player.replace({ uri: url });
        setLoadedPath(audioPath);
      }

      void player.seekTo(0);
      player.play();
    } catch (cause) {
      showToast(strings.audio.error);
      console.warn("Failed to play audio", cause);
    } finally {
      setLoading(false);
    }
  };

  const label = status.playing ? strings.audio.stop : strings.audio.play;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      onPress={() => void onPress()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});