import express from "express";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { reverseGeocode, geocode } from "../src/services/location.js";
import { checkNoise } from "../ai/noiseCheck.js";
import { categoriseReport } from "../ai/categorise.js";
import { getEmbedding } from "../ai/embed.js";
import { findCanonical } from "../services/dedup.js";
import { checkVerification } from "../services/verify.js";
import { validateBody, validateQuery } from "../src/middleware/validate.js";
import { requireAuth, optionalAuth } from "../src/middleware/auth.js";

export const reportsRouter = express.Router();

const createReportSchema = z.object({
  rawText: z.string().min(10),
  zone: z.string().optional(),
  city: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});

const listReportsSchema = z.object({
  zone: z.string().optional(),
  city: z.string().optional(),
  searchLocation: z.string().optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
  noiseLabel: z.string().optional(),
  isVerified: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

const patchReportSchema = z.object({
  category: z.string().optional(),
  severity: z.string().optional(),
});

reportsRouter.post(
  "/",
  requireAuth,
  validateBody(createReportSchema),
  async (req, res, next) => {
    try {
      console.log(`[API:Reports] POST /api/reports - Received new submission`);
      const { rawText, zone: explicitZone, city: explicitCity, isAnonymous } = req.validatedBody;
      const userId = req.user.userId;
      let city = explicitCity || "Unknown";
      let zone = explicitZone || "General Zone";
      
      if (!explicitZone && userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { city: true, zone: true } });
        if (user) {
          city = user.city || city;
          zone = user.zone || zone;
        }
      }

      city = city.toLowerCase();
      zone = zone.toLowerCase();

      const noiseResult = await checkNoise(rawText);

      let category = null;
      let severity = null;
      let embedding = null;
      let usedFallback = noiseResult.usedFallback;

      if (noiseResult.label === "ACTIONABLE") {
        const cat = await categoriseReport(rawText);
        category = cat.category;
        severity = cat.severity;
        usedFallback = usedFallback || cat.usedFallback;

        try {
          const emb = await getEmbedding(rawText);
          embedding = JSON.stringify(emb);
        } catch {
          embedding = null;
        }
      } else if (noiseResult.label === "AMBIGUOUS") {
        const cat = await categoriseReport(rawText);
        category = cat.category;
        severity = cat.severity;
        usedFallback = usedFallback || cat.usedFallback;
      } else if (noiseResult.label === "VENTING") {
        category = "other";
        severity = "NONE";
      }

      let dedupResult = null;
      if (embedding && noiseResult.label === "ACTIONABLE") {
        const embArray = JSON.parse(embedding);
        dedupResult = await findCanonical(embArray, zone, prisma, userId);

        if (dedupResult?.isDuplicateUser) {
          console.log(`[API:Reports] Blocking duplicate report from same user ${userId}`);
          return res.status(400).json({ 
            error: { 
              message: "You've already reported a very similar incident recently. Duplicate reports from the same user are not permitted to ensure data integrity." 
            } 
          });
        }
      }

      const canonicalId = dedupResult?.canonicalId || null;

      const created = await prisma.report.create({
        data: {
          rawText,
          zone,
          city,
          noiseLabel: noiseResult.label,
          category,
          severity,
          embedding,
          isFake: false,
          isAnonymous: isAnonymous === true,
          user: userId ? { connect: { id: userId } } : undefined,
          ...(canonicalId ? { canonical: { connect: { id: canonicalId } } } : {}),
        },
      });

      const canonicalReportId = canonicalId ?? created.id;
      if (!canonicalId && noiseResult.label === "ACTIONABLE") {
        await checkVerification(canonicalReportId, prisma);
      } else if (canonicalId) {
        await checkVerification(canonicalReportId, prisma);
      }

      console.log(`[API:Reports] Successfully created report: ${created.id}`);
      res.status(201).json({ report: created });
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get(
  "/",
  optionalAuth,
  validateQuery(listReportsSchema),
  async (req, res, next) => {
    try {
      console.log(`[API:Reports] GET /api/reports - Fetching reports list`);
      const { zone, city, searchLocation, category, severity, noiseLabel, isVerified, dateFrom, dateTo, limit, offset } =
        req.validatedQuery;

      const where = { canonicalId: null };
      if (zone) where.zone = { contains: zone, mode: "insensitive" };
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (searchLocation) {
        where.OR = [
          { zone: { contains: searchLocation, mode: "insensitive" } },
          { city: { contains: searchLocation, mode: "insensitive" } }
        ];
      }
      if (category) where.category = category;
      if (severity) where.severity = severity;
      if (noiseLabel) where.noiseLabel = noiseLabel;
      if (typeof isVerified === "boolean") where.isVerified = isVerified;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const take = limit ? Number(limit) : 20;
      const skip = offset ? Number(offset) : 0;

      const [reportsRaw, total] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, trustScore: true } },
            votes: true,
            duplicates: true
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.report.count({ where }),
      ]);

      const reports = reportsRaw.map(r => ({
        ...r,
        currentUserVote: req.user ? r.votes.find(v => v.userId === req.user.userId)?.voteType || null : null
      }));

      res.json({ reports, total });
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    console.log(`[API:Reports] GET /api/reports/${id} - Fetching detailed view`);

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, trustScore: true } },
        votes: true,
        duplicates: {
          include: {
            user: { select: { id: true, name: true, trustScore: true } }
          }
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: { message: "Report not found" } });
    }

    const voteCount = {
      verified: report.votes.filter((v) => v.voteType === "verified").length,
      notVerified: report.votes.filter((v) => v.voteType === "not_verified").length,
    };

    const duplicateCount = report.duplicates.length;
    const currentUserVote = req.user ? report.votes.find(v => v.userId === req.user.userId)?.voteType || null : null;

    res.json({ report, voteCount, duplicateCount, currentUserVote });
  } catch (err) {
    next(err);
  }
});

reportsRouter.patch(
  "/:id",
  requireAuth,
  validateBody(patchReportSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      console.log(`[API:Reports] PATCH /api/reports/${id} - Edit attempt`);
      
      const existingReport = await prisma.report.findUnique({
        where: { id },
        select: { userId: true }
      });
      
      if (!existingReport) {
        return res.status(404).json({ error: { message: "Report not found" } });
      }
      
      if (existingReport.userId !== req.user.userId) {
        return res.status(403).json({ error: { message: "Unauthorized: You can only edit your own reports" } });
      }

      const data = {};
      if (req.validatedBody.category) data.category = req.validatedBody.category;
      if (req.validatedBody.severity) data.severity = req.validatedBody.severity;

      const updated = await prisma.report.update({
        where: { id },
        data,
      });

      res.json({ report: updated });
    } catch (err) {
      next(err);
    }
  },
);

