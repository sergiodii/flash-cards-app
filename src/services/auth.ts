import { getSupabase } from "../lib/supabase";

/** Signs in with email + password and returns once Supabase persisted the session. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Creates an account.
 *
 * When email confirmation is enabled on the Supabase project, sign up returns
 * no session and the user must confirm the address before signing in.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await getSupabase().auth.signUp({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return { needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
