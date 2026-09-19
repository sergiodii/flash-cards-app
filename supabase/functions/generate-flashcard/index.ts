/**
 * Edge Function :: generate-flashcard
 *
 * Turns a phrase typed by the user (English or Portuguese) into a complete
 * flashcard with English audio:
 *   1. OpenRouter chat enriches the phrase (translation, phonetics, example,
 *      notes, tags);
 *   2. OpenRouter TTS narrates the English phrase;
 *   3. the mp3 is stored in the private `flash-app` bucket under the caller's
 *      own folder (audios/<user_id>/<flashcard_id>.mp3);
 *   4. the flashcard row is inserted with `audio_path` pointing at the object.
 *
 * Auth: the gateway verifies the JWT; the user id always comes from the token,
 * never from the request body, so nobody can write into another user's folder.
 * The service role is used only to bypass storage/table RLS for this trusted
 * write, always scoped to the verified user id.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  generateCardFields,
  synthesizeSpeech,
} from "../_shared/openrouter.ts";

const BUCKET = "flash-app";
const MAX_INPUT_LENGTH = 500;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) {
    return jsonResponse({ error: "Missing authorization token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server is not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }
  const userId = userData.user.id;

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return jsonResponse({ error: "text is required" }, 400);
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return jsonResponse(
      { error: `text must be at most ${MAX_INPUT_LENGTH} characters` },
      400,
    );
  }

  try {
    const generated = await generateCardFields(text);
    const audio = await synthesizeSpeech(generated.english);
    if (audio.length === 0) {
      throw new Error("Text-to-speech returned no audio");
    }

    const cardId = crypto.randomUUID();
    const audioPath = `audios/${userId}/${cardId}.mp3`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(audioPath, audio, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) {
      throw new Error(`Failed to store audio: ${uploadError.message}`);
    }

    const { data: flashcard, error: insertError } = await admin
      .from("flashcards")
      .insert({
        id: cardId,
        user_id: userId,
        english: generated.english,
        portuguese: generated.portuguese,
        phonetic: generated.phonetic,
        example: generated.example,
        notes: generated.notes,
        tags: generated.tags,
        audio_path: audioPath,
      })
      .select()
      .single();
    if (insertError) {
      throw new Error(`Failed to create flashcard: ${insertError.message}`);
    }

    return jsonResponse({ flashcard }, 200);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return jsonResponse({ error: message }, 502);
  }
});