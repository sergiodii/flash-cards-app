import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { strings } from "../i18n/strings";
import { AddCardScreen } from "../screens/AddCardScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { StudyScreen } from "../screens/StudyScreen";
import { colors } from "../theme/theme";
import { AppDrawerContent } from "./AppDrawerContent";
import type {
  AppDrawerParamList,
  AuthStackParamList,
  RootStackParamList,
} from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Drawer = createDrawerNavigator<AppDrawerParamList>();

/**
 * Chooses between the auth flow and the app itself.
 *
 * Because the whole tree is swapped on session change, signing out drops the
 * user straight back to the login screen without any manual navigation.
 */
export function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <RootStack.Screen name="App" component={AppDrawer} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStackNavigator} />
      )}
    </RootStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.textMuted,
        drawerLabelStyle: { fontWeight: "600" },
      }}
    >
      <Drawer.Screen
        name="Study"
        component={StudyScreen}
        options={{ title: strings.nav.study }}
      />
      <Drawer.Screen
        name="AddCard"
        component={AddCardScreen}
        options={{ title: strings.nav.addCard }}
      />
      <Drawer.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: strings.nav.stats }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: strings.nav.settings }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
