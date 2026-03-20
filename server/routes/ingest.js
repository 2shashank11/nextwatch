import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/lib/prisma.js";
import { reverseGeocode } from "../src/services/location.js";
import { checkNoise } from "../ai/noiseCheck.js";
import { categoriseReport } from "../ai/categorise.js";
import { getEmbedding } from "../ai/embed.js";
import { findCanonical } from "../services/dedup.js";
import { checkVerification } from "../services/verify.js";

export const ingestRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSeedReports() {
  const filePath = path.join(__dirname, "..", "data", "reports.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

ingestRouter.post("/simulate", async (_req, res, next) => {
  try {
    const allReports = await loadSeedReports();

    const shuffled = [...allReports].sort(() => Math.random() - 0.5);
    const batch = shuffled.slice(0, 5);

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    let inserted = 0;

    for (const seed of batch) {
      const timestamp = new Date(now - Math.random() * SEVEN_DAYS);

      const lat = 17.42;
      const lng = 78.43;
      const geo = await reverseGeocode(lat, lng);
      const zone = geo.zone || seed.zone || "General Zone";
      const city = geo.city || "Hyderabad";

      const noiseResult = await checkNoise(seed.rawText);

      let category = null;
      let severity = null;
      let embedding = null;

      if (noiseResult.label === "ACTIONABLE") {
        const cat = await categoriseReport(seed.rawText);
        category = cat.category;
        severity = cat.severity;

        try {
          const emb = await getEmbedding(seed.rawText);
          embedding = JSON.stringify(emb);
        } catch {
          embedding = null;
        }
      } else if (noiseResult.label === "AMBIGUOUS") {
        const cat = await categoriseReport(seed.rawText);
        category = cat.category;
        severity = cat.severity;
      }

      let canonicalId = null;
      if (embedding && noiseResult.label === "ACTIONABLE") {
        const embArray = JSON.parse(embedding);
        canonicalId = await findCanonical(embArray, zone, prisma);
      }

      const created = await prisma.report.create({
        data: {
          rawText: seed.rawText,
          zone,
          city,
          isFake: false,
          noiseLabel: noiseResult.label,
          category,
          severity,
          embedding,
          user: seed.userId ? { connect: { id: seed.userId } } : undefined,
          ...(canonicalId ? { canonical: { connect: { id: canonicalId } } } : {}),
          timestamp,
        },
      });

      const canonicalReportId = canonicalId ?? created.id;
      if (noiseResult.label === "ACTIONABLE") {
        await checkVerification(canonicalReportId, prisma);
      }

      inserted += 1;
    }

    res.json({ inserted });
  } catch (err) {
    next(err);
  }
});
