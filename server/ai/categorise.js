import { openai, AI_MODEL } from "../src/lib/gemini.js";
import { fallbackCategorise } from "./fallback.js";

const CATEGORISE_PROMPT = `You are a community safety analyst for a neighbourhood safety platform.

Analyse the safety report below and return a JSON object with exactly these fields.

CATEGORY — choose the single best match:
- "phishing": scam calls, fake messages, OTP fraud, impersonation, online fraud, identity theft
- "violence": physical assault, threats, weapons, fights, suspicious persons with intent to harm
- "theft": robbery, burglary, pickpocketing, stolen property, break-ins, vehicle theft
- "infrastructure": power cuts, water supply issues, gas leaks, road damage, streetlight failures, building hazards
- "natural_hazard": flooding, fire, earthquake, storm, landslide, fallen trees, cyclone
- "other": does not clearly fit any above category

SEVERITY — choose one based on urgency and impact:
- "CRITICAL": active threat to life or safety happening right now, requires immediate action
- "HIGH": serious incident that has occurred or is spreading, residents should take precautions now
- "MEDIUM": incident has occurred but is contained or resolved, residents should be aware
- "LOW": minor, unconfirmed, or isolated incident with low impact
- "NONE": no real safety incident exists in this report


IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no explanation, no code fences
- All two fields are required

Return exactly:
{
  "category": "...",
  "severity": "..."
}

Report: "{text}"`;

export async function categoriseReport(text) {
  console.log(`[AI:Categorise] Categorising report text`);
  try {

    const prompt = CATEGORISE_PROMPT.replace("{text}", text);
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    const category = parsed.category ?? "other";
    const severity = parsed.severity ?? "MEDIUM";

    console.log(`[AI:Categorise] Result: ${category} | Severity: ${severity}`);

    return {
      category,
      severity,
      usedFallback: false,
    };
  } catch (err) {
    console.error(`[AI:Categorise] Error calling Ollama/Gemini:`, err.message);
    return fallbackCategorise(text);
  }
}

