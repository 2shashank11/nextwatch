import OpenAI from "openai";
import "dotenv/config";


export const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.GEMINI_BASE_URL
});

export const AI_MODEL = process.env.GEMINI_AI_MODEL;
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL;
