export async function applyVerificationTrustBonus(prisma, canonicalReport) {
  if (!canonicalReport.userId || canonicalReport.isAnonymous) return;

  await prisma.user.update({
    where: { id: canonicalReport.userId },
    data: { trustScore: { increment: 10 } },
  });
}

export async function applyVoteConsequences(prisma, canonicalReportId) {
  const now = new Date();
  const FIVE_HOURS_AGO = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  const canonical = await prisma.report.findUnique({
    where: { id: canonicalReportId },
  });
  if (!canonical || !canonical.userId || canonical.isAnonymous) return;

  const verifiedCount = await prisma.vote.count({
    where: {
      reportId: canonicalReportId,
      voteType: "verified",
      createdAt: { gte: FIVE_HOURS_AGO },
    },
  });

  const notVerifiedCount = await prisma.vote.count({
    where: {
      reportId: canonicalReportId,
      voteType: "not_verified",
    },
  });

  const updates = [];

  if (verifiedCount >= 5) {
    updates.push({ trustScore: { increment: 5 } });
  }

  if (notVerifiedCount >= 10) {
    updates.push({ trustScore: { decrement: 20 } });
  }

  if (updates.length === 0) return;

  const combined = updates.reduce(
    (acc, u) => ({
      trustScore: {
        increment: (acc.trustScore?.increment ?? 0) + (u.trustScore?.increment ?? 0),
        decrement: (acc.trustScore?.decrement ?? 0) + (u.trustScore?.decrement ?? 0),
      },
    }),
    {},
  );

  const data = {};
  if (combined.trustScore?.increment) {
    data.trustScore = { increment: combined.trustScore.increment };
  }
  if (combined.trustScore?.decrement) {
    data.trustScore = {
      ...(data.trustScore ?? {}),
      decrement: combined.trustScore.decrement,
    };
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({
      where: { id: canonical.userId },
      data,
    });
  }
}

