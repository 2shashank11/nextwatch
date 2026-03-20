import { openai, AI_MODEL } from "../src/lib/gemini.js";
import { fallbackNoiseCheck } from "./fallback.js";

const NOISE_PROMPT = `You are a community safety classifier for a neighbourhood safety platform.

Your job is to classify a user-submitted report into exactly one of three categories.

CLASSIFICATION RULES:

ACTIONABLE — classify as this if the report describes:
- A real or plausible safety incident (crime, scam, threat, hazard, infrastructure failure)
- A genuine threat to the community or something that can harm someone

VENTING — classify as this if the report:
- Expresses frustration, anger, or complaint with no actual safety incident
- Contains emotional language (excessive punctuation, personal attacks, rants)
- Describes inconvenience rather than danger
- Would not be useful or relevant to other residents

AMBIGUOUS — classify as this ONLY if:
- The report describes something unusual but provides no clear indication of threat or frustration
- A safety concern may exist but not a very critical one to clearly confirm
- It does not clearly fit ACTIONABLE or VENTING

IMPORTANT RULES:
- When in doubt between ACTIONABLE and AMBIGUOUS, choose AMBIGUOUS
- When in doubt between AMBIGUOUS and VENTING, choose VENTING
- Respond with ONLY the single word: ACTIONABLE, VENTING, or AMBIGUOUS
- No explanation, no punctuation, no extra text

Report: "{text}"`;

export async function checkNoise(text) {
  console.log(`[AI:NoiseCheck] Checking text (length: ${text.length})`);
  try {

    const prompt = NOISE_PROMPT.replace("{text}", text);
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
    const label = ["ACTIONABLE", "VENTING", "AMBIGUOUS"].includes(raw)
      ? raw
      : fallbackNoiseCheck(text);

    const usedFallback = !["ACTIONABLE", "VENTING", "AMBIGUOUS"].includes(raw);
    console.log(`[AI:NoiseCheck] Result: ${label} (Fallback: ${usedFallback})`);
    return { label, usedFallback };
  } catch (err) {
    console.error(`[AI:NoiseCheck] Error calling Ollama/Gemini:`, err.message);
    console.log(`[FALLBACK:NoiseCheck] Falling back to keyword-based classification`);
    return { label: fallbackNoiseCheck(text), usedFallback: true };
  }
}

