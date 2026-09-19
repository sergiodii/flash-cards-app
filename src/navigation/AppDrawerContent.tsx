import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { strings } from "../i18n/strings";
import { colors, radii, spacing, typography } from "../theme/theme";

/** Drawer body: the default routes plus the signed-in account and a logout action. */
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props}>
        <View style={styles.account}>
          <Text style={styles.accountLabel}>{strings.account.signedInAs}</Text>
          <Text style={styles.accountEmail} numberOfLines={1}>
            {user?.email ?? strings.account.unknownUser}
          </Text>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
      >
        <Text style={styles.logoutText}>{strings.account.logout}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  account: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  accountLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  accountEmail: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  logout: {
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
  },
  logoutPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
