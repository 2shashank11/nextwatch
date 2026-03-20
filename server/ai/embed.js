import { openai, EMBEDDING_MODEL } from "../src/lib/gemini.js";

export async function getEmbedding(text) {
  console.log(`[AI:Embed] Generating embedding vector`);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  console.log(`[AI:Embed] Successfully generated ${response.data[0].embedding.length} dimensions`);
  return response.data[0].embedding;
}

