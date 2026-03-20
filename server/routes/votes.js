import express from "express";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { validateBody } from "../src/middleware/validate.js";
import { requireAuth } from "../src/middleware/auth.js";
import { applyVoteConsequences } from "../services/trust.js";

export const votesRouter = express.Router();

const voteSchema = z.object({
  voteType: z.enum(["verified", "not_verified"]),
});

votesRouter.post(
  "/:id/vote",
  requireAuth,
  validateBody(voteSchema),
  async (req, res, next) => {
    try {
      const reportId = req.params.id;
      const { voteType } = req.validatedBody;
      const userId = req.user.userId;
      
      console.log(`[API:Votes] POST /api/votes/${reportId}/vote - User ${userId} voted '${voteType}'`);

      try {
        await prisma.vote.upsert({
          where: { reportId_userId: { reportId, userId } },
          update: { voteType },
          create: { reportId, userId, voteType },
        });
      } catch (err) {
        throw err;
      }

      const [verifiedCount, notVerifiedCount] = await Promise.all([
        prisma.vote.count({ where: { reportId, voteType: "verified" } }),
        prisma.vote.count({ where: { reportId, voteType: "not_verified" } }),
      ]);

      await applyVoteConsequences(prisma, reportId);

      const targetReport = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, canonicalId: true } });
      if (targetReport) {
        const canonicalToVerify = targetReport.canonicalId || targetReport.id;
        const { checkVerification } = await import('../services/verify.js');
        await checkVerification(canonicalToVerify, prisma);
      }

      res.status(201).json({
        vote: { reportId, userId, voteType },
        verifiedCount,
        notVerifiedCount,
      });
    } catch (err) {
      next(err);
    }
  },
);

votesRouter.get("/:id/votes", async (req, res, next) => {
  try {
    const reportId = req.params.id;

    const [verifiedCount, notVerifiedCount] = await Promise.all([
      prisma.vote.count({ where: { reportId, voteType: "verified" } }),
      prisma.vote.count({ where: { reportId, voteType: "not_verified" } }),
    ]);

    res.json({ verifiedCount, notVerifiedCount });
  } catch (err) {
    next(err);
  }
});

