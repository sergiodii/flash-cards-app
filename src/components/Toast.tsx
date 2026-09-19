import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme/theme";

const FADE_MS = 180;
const VISIBLE_MS = 2200;

interface ToastProps {
  message: string | null;
  onHide: () => void;
}

/** Transient bottom message that fades in, waits, then fades out. */
export function Toast({ message, onHide }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!message) return;
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_MS }),
      withDelay(
        VISIBLE_MS,
        withTiming(0, { duration: FADE_MS }, (finished) => {
          if (finished) runOnJS(onHide)();
        }),
      ),
    );
  }, [message, onHide, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + spacing.xl },
        animatedStyle,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  text: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },
});