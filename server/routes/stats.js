import express from "express";
import { prisma } from "../src/lib/prisma.js";

import { z } from "zod";
import { validateQuery } from "../src/middleware/validate.js";

export const statsRouter = express.Router();

const statsQuerySchema = z.object({
  zone: z.string().optional(),
  city: z.string().optional(),
});

statsRouter.get("/", validateQuery(statsQuerySchema), async (req, res, next) => {
  try {
    const { zone, city } = req.validatedQuery;

    const where = {};
    if (zone) where.zone = { equals: zone, mode: "insensitive" };
    if (city) where.city = { equals: city, mode: "insensitive" };

    const reports = await prisma.report.findMany({
      where,
    });

    const categoryCounts = {};
    const severityCounts = {};
    const last7DaysMap = new Map();

    const now = new Date();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      last7DaysMap.set(key, 0);
    }

    for (const report of reports) {
      if (report.category) {
        categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
      }
      if (report.severity) {
        severityCounts[report.severity] = (severityCounts[report.severity] || 0) + 1;
      }
      const key = report.createdAt.toISOString().slice(0, 10);
      if (last7DaysMap.has(key)) {
        last7DaysMap.set(key, last7DaysMap.get(key) + 1);
      }
    }

    const last7Days = Array.from(last7DaysMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    res.json({ categoryCounts, severityCounts, last7Days });
  } catch (err) {
    next(err);
  }
});

