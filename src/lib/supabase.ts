import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

import { assertSupabaseConfigured, env } from "../config/env";
import type { Database } from "../types/database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Lazily builds the Supabase client so importing this module never crashes when
 * the environment is not configured yet (for example while running tests).
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    assertSupabaseConfigured();
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    });
  }
  return client;
}
