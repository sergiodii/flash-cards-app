import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { strings } from "../i18n/strings";
import type { AuthStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/theme";
import { authStyles } from "./authStyles";

type LoginNavigation = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LoginNavigation>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError(strings.auth.missingFields);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={authStyles.container}
    >
      <ScrollView
        contentContainerStyle={[
          authStyles.content,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={authStyles.title}>{strings.auth.loginTitle}</Text>
        <Text style={authStyles.subtitle}>{strings.auth.loginSubtitle}</Text>

        <TextField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label={strings.auth.email}
          onChangeText={setEmail}
          value={email}
        />
        <TextField
          autoCapitalize="none"
          label={strings.auth.password}
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />

        {error ? <Text style={authStyles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            authStyles.button,
            (pressed || submitting) && authStyles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={authStyles.buttonText}>
              {strings.auth.loginAction}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Register")}
          style={authStyles.link}
        >
          <Text style={authStyles.linkText}>{strings.auth.goRegister}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
