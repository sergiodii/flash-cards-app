import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../theme/theme";

/** Shared layout for the login and register screens. */
export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
  link: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  linkText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "600",
  },
});
