/**
 * Manual smoke test for OpenRouter text-to-speech.
 *
 * Run it with `make test-audio` (or `yarn test-audio`). The phrase comes from
 * the TEST_AUDIO_TEXT environment variable and the resulting audio is written
 * to test-audio.mp3 in the project root.
 *
 * Requires OPENROUTER_API_KEY, set in .env or exported in the shell.
 */
import { writeFile } from "node:fs/promises";

import { OpenRouter } from "@openrouter/sdk";

const TEXT =
  process.env.TEST_AUDIO_TEXT ?? "Hello! This is a text-to-speech test.";
const MODEL = process.env.TEST_AUDIO_MODEL ?? "deepgram/flux-tts:free";
const VOICE = process.env.TEST_AUDIO_VOICE ?? "flux-alexis-en";
const OUTPUT = process.env.TEST_AUDIO_OUTPUT ?? "test-audio.mp3";

const apiKey = process.env.OPENROUTER_API_KEY ?? "";
if (!apiKey) {
  console.error(
    "OPENROUTER_API_KEY is not set. Add it to .env or export it before running.",
  );
  process.exit(1);
}

try {
  const openrouter = new OpenRouter({ apiKey });

  const stream = await openrouter.tts.createSpeech({
    speechRequest: {
      model: MODEL,
      input: TEXT,
      voice: VOICE,
      responseFormat: "mp3",
    },
  });

  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const audio = Buffer.concat(chunks);
  await writeFile(OUTPUT, audio);

  console.log(`Synthesized "${TEXT}"`);
  console.log(`Saved ${audio.length} bytes to ${OUTPUT}`);
} catch (cause) {
  console.error(
    "Text-to-speech failed:",
    cause instanceof Error ? cause.message : String(cause),
  );
  process.exit(1);
}