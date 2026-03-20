import nock from "nock";
import { checkNoise } from "../ai/noiseCheck.js";
import { categoriseReport } from "../ai/categorise.js";

describe("AI Services and Fallback", () => {
  const BASE_URL = "http://localhost:11434"; // Ollama base URL
  const COMPLETIONS_PATH = "/v1/chat/completions";

  afterEach(() => {
    nock.cleanAll();
  });

  describe("checkNoise", () => {
    it("should return ACTIONABLE when AI succeeds", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(200, {
          choices: [{ message: { content: "ACTIONABLE" } }]
        });

      const result = await checkNoise("There is a fire in the building!");
      expect(result.label).toBe("ACTIONABLE");
      expect(result.usedFallback).toBe(false);
    });

    it("should use fallback when AI fails", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(500);

      const result = await checkNoise("This is a scam call I received.");
      // "scam" is in ACTIONABLE_SIGNALS in fallback.js
      expect(result.label).toBe("ACTIONABLE");
      expect(result.usedFallback).toBe(true);
    });

    it("should use fallback when AI returns invalid label", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(200, {
          choices: [{ message: { content: "UNKNOWN_LABEL" } }]
        });

      const result = await checkNoise("random text");
      expect(result.usedFallback).toBe(true);
    });
  });

  describe("categoriseReport", () => {
    it("should return parsed category when AI succeeds", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(200, {
          choices: [{ 
            message: { 
              content: JSON.stringify({ category: "theft", severity: "HIGH" }) 
            } 
          }]
        });

      const result = await categoriseReport("Someone stole my bike.");
      expect(result.category).toBe("theft");
      expect(result.severity).toBe("HIGH");
      expect(result.usedFallback).toBe(false);
    });

    it("should use keyword-based fallback when AI fails", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(500);

      const result = await categoriseReport("There is a flood in the street.");
      // "flood" is in CATEGORY_KEYWORDS.natural_hazard
      expect(result.category).toBe("natural_hazard");
      expect(result.usedFallback).toBe(true);
    });

    it("should use keyword-based fallback for severity", async () => {
      nock(BASE_URL)
        .post(COMPLETIONS_PATH)
        .reply(500);

      const result = await categoriseReport("EMERGENCY! Armed robbery happening now!");
      expect(result.severity).toBe("CRITICAL");
      expect(result.usedFallback).toBe(true);
    });
  });
});
