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

type RegisterNavigation = NativeStackNavigationProp<
  AuthStackParamList,
  "Register"
>;

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RegisterNavigation>();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError(strings.auth.missingFields);
      return;
    }
    if (password !== confirmation) {
      setError(strings.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password);
      if (needsEmailConfirmation) {
        setNotice(strings.auth.confirmationSent);
      }
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
        <Text style={authStyles.title}>{strings.auth.registerTitle}</Text>
        <Text style={authStyles.subtitle}>{strings.auth.registerSubtitle}</Text>

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
        <TextField
          autoCapitalize="none"
          label={strings.auth.confirmPassword}
          onChangeText={setConfirmation}
          secureTextEntry
          value={confirmation}
        />

        {error ? <Text style={authStyles.error}>{error}</Text> : null}
        {notice ? <Text style={authStyles.notice}>{notice}</Text> : null}

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
              {strings.auth.registerAction}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Login")}
          style={authStyles.link}
        >
          <Text style={authStyles.linkText}>{strings.auth.goLogin}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
