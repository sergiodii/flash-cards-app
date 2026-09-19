/**
 * Edge Functions :: OpenRouter client.
 *
 * Wraps the two model calls the `generate-flashcard` function needs:
 *   1. a chat completion that turns free text into structured card fields;
 *   2. a text-to-speech synthesis that returns the audio bytes.
 *
 * Both use the official SDK (`npm:@openrouter/sdk`). The API key is a server
 * secret (`supabase secrets set OPENROUTER_API_KEY=...`) and never leaves the
 * function runtime.
 */
import { OpenRouter } from "npm:@openrouter/sdk";

const CHAT_MODEL = "openrouter/free";
const TTS_MODEL = "deepgram/flux-tts:free";
const TTS_VOICE = "flux-alexis-en";

export interface GeneratedCard {
  english: string;
  portuguese: string;
  phonetic: string | null;
  example: string | null;
  notes: string | null;
  tags: string[];
}

interface ChatStreamChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
}

let client: OpenRouter | null = null;

function getClient(): OpenRouter {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenRouter({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = [
  "You build English study flashcards for a Brazilian Portuguese speaker.",
  "The user sends a phrase or word in English OR Portuguese.",
  "Detect the language: if the input is Portuguese, translate it to English;",
  "if it is English, translate it to Portuguese.",
  "Reply with ONLY a JSON object, no prose and no markdown fences.",
  'Schema: {"english": string, "portuguese": string, "phonetic": string,',
  '"example": string, "notes": string, "tags": string[]}.',
  "Rules: `english` is always the English phrase verbatim or translated;",
  "`portuguese` is the Brazilian Portuguese translation;",
  "`phonetic` is an IPA pronunciation of the English phrase;",
  "`example` is one short natural English example sentence;",
  "`notes` is a short usage tip in Portuguese (may be empty);",
  "`tags` holds 1 to 4 short lowercase topic tags.",
].join(" ");

/** Turns free text (EN or PT) into the fields of a new flashcard. */
export async function generateCardFields(text: string): Promise<GeneratedCard> {
  const stream = await getClient().chat.send({
    chatRequest: {
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      stream: true,
    },
  });

  let response = "";
  for await (const chunk of stream as AsyncIterable<ChatStreamChunk>) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      response += content;
    }
  }

  return parseGeneratedCard(response);
}

/** Synthesizes the English phrase and returns the mp3 bytes. */
export async function synthesizeSpeech(english: string): Promise<Uint8Array> {
  const stream = await getClient().tts.createSpeech({
    speechRequest: {
      model: TTS_MODEL,
      input: english,
      voice: TTS_VOICE,
    },
  });

  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return concatenate(chunks);
}

/** Parses the model reply defensively: tolerates fences and missing fields. */
export function parseGeneratedCard(raw: string): GeneratedCard {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("The model did not return valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("The model did not return a card object");
  }

  const record = parsed as Record<string, unknown>;
  const english = asText(record.english);
  const portuguese = asText(record.portuguese);

  if (!english || !portuguese) {
    throw new Error("The generated card is missing english or portuguese");
  }

  return {
    english,
    portuguese,
    phonetic: asText(record.phonetic),
    example: asText(record.example),
    notes: asText(record.notes),
    tags: asTags(record.tags),
  };
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .slice(0, 6);
}

function concatenate(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}