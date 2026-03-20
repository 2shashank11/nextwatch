import express from "express";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { validateBody } from "../src/middleware/validate.js";

export const usersRouter = express.Router();

const safeCircleSchema = z.object({
  name: z.string().optional(),
  zone: z.string().optional(),
});

const preferencesSchema = z.object({
  wantsDailyDigest: z.boolean(),
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [user, incidentsReported, noOfVotes, verifications] = await Promise.all([
      prisma.user.findUnique({ 
        where: { id },
        include: {
          reports: { orderBy: { createdAt: 'desc' }, take: 50 },
          votes: { include: { report: true }, orderBy: { createdAt: 'desc' }, take: 50 },
          circleStatus: true
        }
      }),
      prisma.report.count({ where: { userId: id } }),
      prisma.vote.count({ where: { userId: id } }),
      prisma.report.count({ where: { userId: id, isVerified: true } })
    ]);

    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    const { password, ...safeUser } = user;

    const stats = {
      incidentsReported,
      noOfVotes,
      verifications
    };

    res.json({ user: safeUser, trustScore: user.trustScore, stats });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch(
  "/:id/safe-circle",
  validateBody(safeCircleSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const { name, zone } = req.validatedBody;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { name, zone },
      });
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  "/:id/preferences",
  validateBody(preferencesSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const { wantsDailyDigest } = req.validatedBody;
      const user = await prisma.user.update({
        where: { id },
        data: { wantsDailyDigest },
      });
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      next(err);
    }
  }
);
