import OpenAI from "openai";
import "dotenv/config";


export const openai = new OpenAI({
  apiKey: process.env.OLLAMA_API_KEY,
  baseURL: process.env.OLLAMA_BASE_URL
});

export const AI_MODEL = process.env.OLLAMA_AI_MODEL;
export const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL;
