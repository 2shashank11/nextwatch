export function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export async function findCanonical(newEmbedding, zone, prisma, userId) {
  console.log(`[Service:Dedup] Checking for canonical duplicates in zone: ${zone}`);
  const THRESHOLD = 0.75;
  const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recent = await prisma.report.findMany({
    where: {
      zone,
      canonicalId: null,
      createdAt: { gte: SIX_HOURS_AGO },
      noiseLabel: "ACTIONABLE",
    },
    include: {
      duplicates: {
        where: { userId },
        select: { id: true }
      }
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let canonicalId = null

  for (const report of recent) {
    if (!report.embedding) continue;
    const existingEmbedding = JSON.parse(report.embedding);
    const sim = cosineSimilarity(newEmbedding, existingEmbedding);
    
    if (sim >= THRESHOLD) {
      // Check if user is the author of the canonical OR already has a duplicate in this cluster
      if (report.userId === userId || (report.duplicates && report.duplicates.length > 0)) {
        console.log(`[Service:Dedup] Anti-Spam: User ${userId} already has a report in cluster ${report.id}`);
        return { isDuplicateUser: true, canonicalId: report.id };
      }
      
      if (canonicalId === null) {
        console.log(`[Service:Dedup] Found canonical match: ${report.id} (Similarity: ${sim.toFixed(4)})`);
        canonicalId = report.id;
      }
    }
  }

  return {canonicalId: canonicalId};
}

