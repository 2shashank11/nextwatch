import { openai, AI_MODEL } from "../src/lib/gemini.js";

const DIGEST_PROMPT = `You are a calm community safety assistant writing a neighbourhood safety digest.

A safety incident has been verified in a neighbourhood through multiple community reports.
Your digest will be emailed and displayed to all residents in the affected area.

WRITING RULES:
- Use calm, factual, empowering language at all times
- Never use alarming words: dangerous, terrifying, urgent, panic, threat, attack, beware, warning
- Write as if speaking to a neighbour, not broadcasting a news alert
- Every action step must be specific and immediately actionable — no vague advice like "stay safe"
- Action steps must be relevant to the specific category and context, not generic
- Do not repeat information between the content summary and the action steps

CONTENT FIELD RULES:
- 3 to 4 sentences maximum
- Cover: what happened, where (zone level only, no exact addresses), and current status
- Include all key details from the incident context — do not omit specific scam methods, stolen items, or hazard types
- End with a reassuring statement about community awareness

ACTION STEPS RULES:
- Provide exactly 5 to 10 steps
- Each step starts with an action verb
- Steps are ordered from most immediate to least immediate
- Steps are specific to the category — phishing steps differ from theft steps differ from infrastructure steps

IMPORTANT:
- Return ONLY valid JSON with no markdown, no code fences, no explanation
- Both fields are required

Return exactly:
{
  "content": Few sentences and calm factual summary",
  "actionSteps": ["step 1", "step 2", "step 3"...]
}

Incident category: {category}
Verified zone: {zone}
City: {city}
Incident context from community reports:
{reportContext}`;

const FALLBACK_TEMPLATES = {
  phishing: {
    content: "A scam or phishing attempt has been reported in your area.",
    actionSteps: [
      "Do not respond to unsolicited calls asking for OTP, passwords, or gift cards",
      "Hang up and call back on the official number if in doubt",
      "Report suspicious numbers to your bank and cybercrime.gov.in",
    ],
  },
  violence: {
    content: "An incident has been reported in your area — please stay alert.",
    actionSteps: [
      "Avoid the reported area until authorities confirm it is clear",
      "Stay in well-lit, populated areas",
      "Contact local police at 100 if you witness anything suspicious",
    ],
  },
  theft: {
    content: "Theft activity has been reported in your neighbourhood.",
    actionSteps: [
      "Keep valuables secure and avoid displaying them in public",
      "Ensure your home is locked, including windows",
      "Report suspicious persons to local police at 100",
    ],
  },
  infrastructure: {
    content: "An infrastructure issue has been reported in your area.",
    actionSteps: [
      "Avoid the affected area if possible",
      "Report to local municipal helpline",
      "Check official channels for updates",
    ],
  },
  natural_hazard: {
    content: "A natural hazard has been reported near your area.",
    actionSteps: [
      "Follow official advisories and stay indoors if advised",
      "Keep emergency contacts and supplies ready",
      "Monitor official weather and disaster management channels",
    ],
  },
  other: {
    content: "A community safety alert has been issued for your area.",
    actionSteps: [
      "Stay alert and aware of your surroundings",
      "Report further incidents through the Nexwatch app",
      "Contact local authorities if you feel unsafe",
    ],
  },
};

function fallbackDigest(category) {
  const template = FALLBACK_TEMPLATES[category] ?? FALLBACK_TEMPLATES.other;
  return { ...template, usedFallback: true };
}

export async function generateDigest(report) {
  const { category, zone, city, rawText, severity, timestamp, isAnonymous } = report;
  console.log(`[AI:Digest] Generating digest for ${category} in ${zone}, ${city}`);
  
  const reportContext = JSON.stringify({
    rawText,
    severity,
    reportedAt: timestamp,
    isAnonymous
  }, null, 2);

  try {

    const prompt = DIGEST_PROMPT.replace("{category}", category)
      .replace("{reportContext}", reportContext)
      .replace("{zone}", zone)
      .replace("{city}", city);

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    const digestContent = parsed.content ?? fallbackDigest(category).content;
    const actionSteps =
      Array.isArray(parsed.actionSteps) && parsed.actionSteps.length > 0
        ? parsed.actionSteps.slice(0, 7)
        : fallbackDigest(category).actionSteps;

    console.log(`[AI:Digest] Successfully generated digest content`);

    return {
      content: digestContent,
      actionSteps,
      usedFallback: false,
    };
  } catch (err) {
    console.error(`[AI:Digest] Error calling Ollama/Gemini:`, err.message);
    console.log(`[FALLBACK:Digest] Falling back to keyword-based digest generation`);
    return fallbackDigest(category);
  }
}

