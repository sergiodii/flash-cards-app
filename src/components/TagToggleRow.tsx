import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, spacing, typography } from "../theme/theme";

export function TagToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onToggle}
        thumbColor={colors.white}
        trackColor={{ false: colors.border, true: colors.accent }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    flexShrink: 1,
  },
});
