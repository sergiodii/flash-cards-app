/**
 * Environment access.
 *
 * Expo only inlines `process.env.EXPO_PUBLIC_*` when it is read as a static
 * member expression, so these values must be referenced literally here.
 */

export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const env: AppEnv = { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 0;

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and set " +
        "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}
