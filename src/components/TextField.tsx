import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, radii, spacing, typography } from "../theme/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
}

/** Labelled text input styled for the dark theme, shared by every form. */
export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
  },
});
