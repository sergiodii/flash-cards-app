import { useCallback } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { directionFromTranslation, shouldCommitSwipe } from "../domain/repetition";
import { strings } from "../i18n/strings";
import { colors, radii, spacing } from "../theme/theme";
import type {
  Flashcard,
  FlashcardProgress,
  SwipeDirection,
} from "../types/flashcard";
import { FlashcardFace } from "./FlashcardFace";

const SWIPE_THRESHOLD_RATIO = 0.28;
const FLING_VELOCITY = 850;
const EXIT_DURATION = 280;
const MAX_ROTATION = 10;
const PEEK_PARALLAX = 0.3;
const PEEK_SCALE = 0.95;

interface SwipeDeckProps {
  card: Flashcard;
  nextCard: Flashcard | null;
  progress?: FlashcardProgress | null;
  nextProgress?: FlashcardProgress | null;
  privateTags?: string[];
  nextPrivateTags?: string[];
  onCommit: (direction: SwipeDirection) => void;
}

/**
 * The swipeable deck.
 *
 * The top card follows the finger and rotates around a pivot placed below its
 * bottom edge, so the bottom stays nearly centred while the top sweeps a wider
 * circular arc. The card underneath only follows a fraction of the drag
 * (parallax), which is what keeps the base of the stack centred.
 */
export function SwipeDeck({
  card,
  nextCard,
  progress,
  nextProgress,
  privateTags,
  nextPrivateTags,
  onCommit,
}: SwipeDeckProps) {
  const { width } = useWindowDimensions();
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const threshold = width * SWIPE_THRESHOLD_RATIO;
  const exitDistance = width * 1.6;

  const handleCommit = useCallback(
    (direction: SwipeDirection) => {
      onCommit(direction);
    },
    [onCommit],
  );

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY;
    })
    .onEnd((event) => {
      const commit =
        shouldCommitSwipe(translationX.value, threshold) ||
        Math.abs(event.velocityX) > FLING_VELOCITY;

      if (commit) {
        const direction = directionFromTranslation(translationX.value);
        translationX.value = withTiming(
          direction === "right" ? exitDistance : -exitDistance,
          { duration: EXIT_DURATION },
        );
        translationY.value = withTiming(
          translationY.value + event.velocityY * 0.08,
          { duration: EXIT_DURATION },
        );
        runOnJS(handleCommit)(direction);
      } else {
        translationX.value = withSpring(0, { damping: 16, stiffness: 160 });
        translationY.value = withSpring(0, { damping: 16, stiffness: 160 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translationX.value,
      [-width, 0, width],
      [-MAX_ROTATION, 0, MAX_ROTATION],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const peekStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value * PEEK_PARALLAX },
      { translateY: translationY.value * PEEK_PARALLAX },
      { scale: PEEK_SCALE },
    ],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      translationX.value,
      [-width * 0.4, 0, width * 0.4],
      [colors.danger, colors.border, colors.success],
    ),
    opacity: interpolate(
      Math.abs(translationX.value),
      [0, threshold * 0.4, threshold],
      [0, 0.7, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const reviewBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translationX.value,
      [-threshold, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const knowBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translationX.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.deck}>
      {nextCard ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.card, styles.peek, peekStyle]}
        >
          <FlashcardFace
            card={nextCard}
            progress={nextProgress}
            privateTags={nextPrivateTags}
          />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, styles.topCard, cardStyle]}>
          <FlashcardFace card={card} progress={progress} privateTags={privateTags} />
          <Animated.View
            pointerEvents="none"
            style={[styles.borderOverlay, borderStyle]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.badge, styles.badgeLeft, reviewBadgeStyle]}
          >
            <Text style={[styles.badgeText, styles.badgeDanger]}>
              {strings.swipe.review}
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.badge, styles.badgeRight, knowBadgeStyle]}
          >
            <Text style={[styles.badgeText, styles.badgeSuccess]}>
              {strings.swipe.know}
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    ...StyleSheet.absoluteFill,
  },
  topCard: {
    transformOrigin: "50% 140%",
  },
  peek: {
    opacity: 0.85,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    borderWidth: 3,
  },
  badge: {
    position: "absolute",
    top: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 2,
  },
  badgeLeft: {
    left: spacing.lg,
    borderColor: colors.danger,
    transform: [{ rotate: "-8deg" }],
  },
  badgeRight: {
    right: spacing.lg,
    borderColor: colors.success,
    transform: [{ rotate: "8deg" }],
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  badgeDanger: {
    color: colors.danger,
  },
  badgeSuccess: {
    color: colors.success,
  },
});
