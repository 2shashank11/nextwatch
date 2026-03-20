const VENTING_SIGNALS = [
  "!!!",
  "so annoying",
  "unbelievable",
  "nobody cares",
  "worst",
  "terrible",
  "ugh",
  "omg",
  "seriously",
  "can you believe",
];

const ACTIONABLE_SIGNALS = [
  "scam",
  "fraud",
  "robbery",
  "attack",
  "suspicious",
  "breach",
  "phishing",
  "stolen",
  "fire",
  "flood",
  "earthquake",
];

export function fallbackNoiseCheck(text) {
  const lower = text.toLowerCase();
  const ventingScore = VENTING_SIGNALS.filter((s) => lower.includes(s)).length;
  const actionableScore = ACTIONABLE_SIGNALS.filter((s) => lower.includes(s)).length;
  if (ventingScore > actionableScore) return "VENTING";
  if (actionableScore > 0) return "ACTIONABLE";
  return "AMBIGUOUS";
}

const CATEGORY_KEYWORDS = {
  phishing: [
    "otp",
    "phishing",
    "scam call",
    "fraud",
    "gift card",
    "bank account",
    "password",
    "verify your",
  ],
  violence: [
    "attack",
    "assault",
    "knife",
    "gun",
    "robbery",
    "fight",
    "threatening",
    "shooting",
  ],
  theft: [
    "stolen",
    "theft",
    "pickpocket",
    "burglary",
    "break-in",
    "snatched",
    "missing",
  ],
  infrastructure: [
    "power cut",
    "water supply",
    "road",
    "pothole",
    "streetlight",
    "gas leak",
    "pipeline",
  ],
  natural_hazard: [
    "flood",
    "fire",
    "earthquake",
    "cyclone",
    "landslide",
    "lightning",
    "storm",
  ],
};

const SEVERITY_KEYWORDS = {
  CRITICAL: ["active", "right now", "happening now", "emergency", "immediately", "armed"],
  HIGH: ["just happened", "multiple", "several", "spreading", "ongoing"],
  LOW: ["minor", "small", "not sure", "maybe", "possibly", "heard that"],
};

export function fallbackCategorise(text) {
  const lower = text.toLowerCase();
  let category = "other";
  let severity = "MEDIUM";

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      category = cat;
      break;
    }
  }

  if (SEVERITY_KEYWORDS.CRITICAL.some((k) => lower.includes(k))) severity = "CRITICAL";
  else if (SEVERITY_KEYWORDS.HIGH.some((k) => lower.includes(k))) severity = "HIGH";
  else if (SEVERITY_KEYWORDS.LOW.some((k) => lower.includes(k))) severity = "LOW";

  return { category, severity, usedFallback: true };
}

