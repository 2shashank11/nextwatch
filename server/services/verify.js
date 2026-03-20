import { applyVerificationTrustBonus, applyVoteConsequences } from "./trust.js";
import { triggerDigest } from "./digestTrigger.js";
import { categoriseReport } from "../ai/categorise.js";

export async function checkVerification(canonicalId, prisma) {
  console.log(`[Service:Verify] Evaluating verification thresholds for report: ${canonicalId}`);
  const canonical = await prisma.report.findUnique({ where: { id: canonicalId } });
  if (!canonical) {
    console.log(`[Service:Verify] Aborting: Report ${canonicalId} not found.`);
    return;
  }
  if (canonical.isVerified) {
    console.log(`[Service:Verify] Aborting: Report ${canonicalId} is already verified.`);
    return;
  }

  // --- AMBIGUOUS promotion / demotion logic ---
  if (canonical.noiseLabel === "AMBIGUOUS") {
    const now = new Date();
    const FIVE_HOURS_AGO = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    const verifiedCount = await prisma.vote.count({
      where: {
        reportId: canonicalId,
        voteType: "verified",
        createdAt: { gte: FIVE_HOURS_AGO },
      },
    });

    const notVerifiedCount = await prisma.vote.count({
      where: {
        reportId: canonicalId,
        voteType: "not_verified",
      },
    });

    if (verifiedCount >= 5) {
      // Promote to ACTIONABLE – recategorise via AI
      console.log(`[Service:Verify] PROMOTED: Ambiguous report ${canonicalId} promoted to ACTIONABLE.`);
      console.log(`[Service:Verify]   - Reasoning: Current verifiedVotes (${verifiedCount}) >= Required (5) for promotion.`);
      let category = null;
      let severity = null;
      try {
        const cat = await categoriseReport(canonical.rawText);
        category = cat.category;
        severity = cat.severity;
      } catch (err) {
        console.error(`[Service:Verify] ❌ ERROR: AI categorisation failed for ${canonicalId}:`, err);
      }
      const updated = await prisma.report.update({
        where: { id: canonicalId },
        data: { noiseLabel: "ACTIONABLE", category, severity },
      });
      await applyVerificationTrustBonus(prisma, updated);
      await triggerDigest(updated);
      return;
    }

    if (notVerifiedCount >= 10) {
      // Demote to VENTING – apply trust penalty
      console.log(`[Service:Verify] DEMOTED: Ambiguous report ${canonicalId} demoted to VENTING.`);
      console.log(`[Service:Verify]   - Reasoning: Current notVerifiedVotes (${notVerifiedCount}) >= Required (10) for demotion.`);
      await prisma.report.update({
        where: { id: canonicalId },
        data: { noiseLabel: "VENTING", category: "other", severity: "NONE" },
      });
      await applyVoteConsequences(prisma, canonicalId);
      return;
    }

    console.log(`[Service:Verify] ⏳ AMBIGUOUS THRESHOLD NOT MET: Report ${canonicalId} remains Ambiguous.`);
    console.log(`[Service:Verify]   - Current:  { verifiedVotes: ${verifiedCount}, notVerifiedVotes: ${notVerifiedCount} }`);
    console.log(`[Service:Verify]   - Required: { verifiedVotes: 5 } for Promotion OR { notVerifiedVotes: 10 } for Demotion`);
    return;
  }

  // --- Existing verified-report promotion logic ---
  // Find all duplicates mapping to this canonical report
  const duplicateIds = (await prisma.report.findMany({
    where: { canonicalId },
    select: { id: true }
  })).map(r => r.id);

  const duplicateCount = duplicateIds.length;

  // Pool upvotes across the canonical report and all its duplicates
  const allRelatedIds = [canonicalId, ...duplicateIds];
  const upvoteCount = await prisma.vote.count({
    where: {
      reportId: { in: allRelatedIds },
      voteType: "verified"
    }
  });

  // Threshold: >10 upvotes, >=3 duplicates, or a robust mix
  if (duplicateCount >= 3 || upvoteCount >= 10 || (duplicateCount + upvoteCount) >= 7) {
    const reason = duplicateCount >= 3 ? `Duplicates (${duplicateCount} >= 3)` : (upvoteCount >= 10 ? `Upvotes (${upvoteCount} >= 10)` : `Combined (${duplicateCount + upvoteCount} >= 7)`);
    console.log(`[Service:Verify] ✅ THRESHOLD MET: Report ${canonicalId} verified via ${reason}.`);
    await prisma.report.update({
      where: { id: canonicalId },
      data: { 
        isVerified: true,
        confirmationCount: 1 + duplicateCount + upvoteCount
      },
    });

    // Re-fetch full record to guarantee category/severity are present for digest
    const fullReport = await prisma.report.findUnique({ where: { id: canonicalId } });
    await applyVerificationTrustBonus(prisma, fullReport);
    await triggerDigest(fullReport);
  } else {
    console.log(`[Service:Verify] ⏳ THRESHOLD NOT MET: Report ${canonicalId} remains unverified.`);
    console.log(`[Service:Verify]   - Current:  { duplicates: ${duplicateCount}, verifiedVotes: ${upvoteCount}, combined: ${duplicateCount + upvoteCount} }`);
    console.log(`[Service:Verify]   - Required: { duplicates: 3 } OR { verifiedVotes: 10 } OR { combined: 7 }`);
  }
}

