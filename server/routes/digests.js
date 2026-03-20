import express from "express";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { validateQuery } from "../src/middleware/validate.js";

export const digestsRouter = express.Router();

const listDigestsSchema = z.object({
  zone: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

digestsRouter.get(
  "/",
  validateQuery(listDigestsSchema),
  async (req, res, next) => {
    try {
      const { zone, city, search, limit, offset } = req.validatedQuery;
      const where = {};
      if (zone) where.zone = { contains: zone, mode: "insensitive" };
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (search) {
        where.OR = [
          { zone: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ];
      }

      const take = limit ? Number(limit) : 20;
      const skip = offset ? Number(offset) : 0;

      const reportSelect = {
        id: true,
        rawText: true,
        category: true,
        severity: true,
        zone: true,
        createdAt: true,
        confirmationCount: true,
      };

      const digests = await prisma.digest.findMany({
        where,
        orderBy: { triggeredAt: "desc" },
        take,
        skip,
        include: { report: { select: reportSelect } },
      });

      res.json({ digests });
    } catch (err) {
      next(err);
    }
  },
);

digestsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const digest = await prisma.digest.findUnique({
      where: { id },
      include: {
        report: {
          select: {
            id: true,
            rawText: true,
            category: true,
            severity: true,
            zone: true,
            createdAt: true,
            confirmationCount: true,
          },
        },
      },
    });
    if (!digest) {
      return res.status(404).json({ error: { message: "Digest not found" } });
    }
    res.json({ digest });
  } catch (err) {
    next(err);
  }
});

