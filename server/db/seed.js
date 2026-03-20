import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import "dotenv/config";

// ─────────────────────────────────────────────
// DEMO CREDENTIALS — all passwords: 123456
// ─────────────────────────────────────────────

const PASS_PLAIN = "123456";
const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────
// HARDCODED UUIDs — never auto-generate in seed
// ─────────────────────────────────────────────

const U = {
  ARJUN:  "550e8400-e29b-41d4-a716-446655440000", // jubilee hills  | trust: 85 | primary demo user
  PRIYA:  "550e8400-e29b-41d4-a716-446655440001", // jubilee hills  | trust: 60 | circle status: ALERT
  RAVI:   "550e8400-e29b-41d4-a716-446655440002", // banjara hills  | trust: 30 | no circle status
  MEERA:  "550e8400-e29b-41d4-a716-446655440003", // banjara hills  | trust: 45
  KARAN:  "550e8400-e29b-41d4-a716-446655440004", // jubilee hills  | trust: 5  | low trust demo
  ANANYA: "550e8400-e29b-41d4-a716-446655440005", // jubilee hills  | trust: 75
  ADITYA: "550e8400-e29b-41d4-a716-446655440006", // banjara hills  | trust: 90
  SANYA:  "550e8400-e29b-41d4-a716-446655440007", // jubilee hills  | trust: 65
  VIKRAM: "550e8400-e29b-41d4-a716-446655440008", // banjara hills  | trust: 80
  ISHANI: "550e8400-e29b-41d4-a716-446655440009", // jubilee hills  | trust: 70
};

const R = {
  // ── CLUSTER 1: CRITICAL phishing — jubilee hills ──────────────────────────
  // Verified via duplicates path: 3 duplicate reports → duplicates >= 3 ✓
  // Has digest. Nothing 1-away here — this is the "fully verified" showcase.
  PHISHING_CANONICAL: "650e8400-e29b-41d4-a716-446655440000",
  PHISHING_DUP_1:     "650e8400-e29b-41d4-a716-446655440001",
  PHISHING_DUP_2:     "650e8400-e29b-41d4-a716-446655440002",
  PHISHING_DUP_3:     "650e8400-e29b-41d4-a716-446655440003",

  // ── CLUSTER 2: HIGH violence — jubilee hills ──────────────────────────────
  // Verified via combined path: 2 duplicates + 5 verified votes = 7 → combined >= 7 ✓
  // Has digest. Nothing 1-away here — also fully verified showcase.
  VIOLENCE_CANONICAL: "650e8400-e29b-41d4-a716-446655440100",
  VIOLENCE_DUP_1:     "650e8400-e29b-41d4-a716-446655440101",
  VIOLENCE_DUP_2:     "650e8400-e29b-41d4-a716-446655440102",

  // ── THEFT: MEDIUM — jubilee hills ─────────────────────────────────────────
  // NOT verified yet. Combined = 6 (0 duplicates + 6 verified votes). Needs 7.
  // 1 AWAY → submit 1 more verified vote to trigger verification + digest.
  THEFT_MEDIUM:       "650e8400-e29b-41d4-a716-446655440200",

  // ── GAS LEAK: HIGH infrastructure — banjara hills ─────────────────────────
  // NOT verified yet. Duplicates = 2. Needs 3.
  // 1 AWAY → submit 1 more report about gas leak in banjara hills to trigger verification + digest.
  GAS_LEAK_CANONICAL: "650e8400-e29b-41d4-a716-446655440300",
  GAS_LEAK_DUP_1:     "650e8400-e29b-41d4-a716-446655440301",
  GAS_LEAK_DUP_2:     "650e8400-e29b-41d4-a716-446655440302",

  // ── AMBIGUOUS — jubilee hills ─────────────────────────────────────────────
  // noiseLabel: AMBIGUOUS. verifiedVotes = 4. Needs 5 to promote to ACTIONABLE.
  // 1 AWAY → cast 1 more verified vote to promote it and trigger the full pipeline.
  AMBIGUOUS_REPORT:   "650e8400-e29b-41d4-a716-446655440400",

  // ── VENTING — jubilee hills ───────────────────────────────────────────────
  // noiseLabel: VENTING. Stored in DB. Never enters pipeline. Never in digest feed.
  // Showcases the noise filter working.
  VENTING_REPORT:     "650e8400-e29b-41d4-a716-446655440500",

  // ── LOW TRUST PENALTY — jubilee hills ─────────────────────────────────────
  // notVerifiedVotes = 9. Needs 10 to mark isFake.
  // 1 AWAY → cast 1 more not_verified vote to mark it fake and penalise Karan.
  LOW_TRUST_PENALTY:  "650e8400-e29b-41d4-a716-446655440600",

  // ── ANONYMOUS — jubilee hills ─────────────────────────────────────────────
  // isAnonymous: true, userId: null. Shows anonymous pipeline working.
  // No trust score awarded even if verified.
  ANONYMOUS_REPORT:   "650e8400-e29b-41d4-a716-446655440700",

  // ── TRENDS DATA — spread across 7 days ───────────────────────────────────
  // These exist purely to populate the Recharts trends dashboard.
  // Mix of zones, categories, severities, and timestamps.
  TRENDS_1: "650e8400-e29b-41d4-a716-446655440800", // natural_hazard  | jubilee hills  | 2d ago
  TRENDS_2: "650e8400-e29b-41d4-a716-446655440801", // infrastructure  | banjara hills  | 3d ago
  TRENDS_3: "650e8400-e29b-41d4-a716-446655440802", // theft           | jubilee hills  | 4d ago
  TRENDS_4: "650e8400-e29b-41d4-a716-446655440803", // phishing        | banjara hills  | 5d ago
  TRENDS_5: "650e8400-e29b-41d4-a716-446655440804", // infrastructure  | jubilee hills  | 6d ago
};

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Starting Nexwatch database seed...\n");

  // ── STEP 1: Clean in reverse dependency order ─────────────────────────────
  console.log("🧹 Cleaning database...");
  await prisma.circleStatus.deleteMany({});
  await prisma.vote.deleteMany({});
  await prisma.digest.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});

  // ── STEP 2: Hash password once, reuse for all users ───────────────────────
  console.log("🔐 Hashing password...");
  const hashed = await bcrypt.hash(PASS_PLAIN, SALT_ROUNDS);

  // ── STEP 3: Insert users ──────────────────────────────────────────────────
  console.log("👥 Inserting users...");
  await prisma.user.createMany({
    data: [
      {
        id: U.ARJUN,
        name: "Arjun Mehta",
        email: "arjun@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 85,
        wantsDailyDigest: true,
        safeCircleIds: [], // set in step 8
      },
      {
        id: U.PRIYA,
        name: "Priya Sharma",
        email: "priya@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 60,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.RAVI,
        name: "Ravi Kumar",
        email: "ravi@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "banjara hills",
        trustScore: 30,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.MEERA,
        name: "Meera Nair",
        email: "meera@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "banjara hills",
        trustScore: 45,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.KARAN,
        name: "Karan Das",
        email: "karan@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 5,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.ANANYA,
        name: "Ananya Iyer",
        email: "ananya@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 75,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.ADITYA,
        name: "Aditya Verma",
        email: "aditya@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "banjara hills",
        trustScore: 90,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.SANYA,
        name: "Sanya Malhotra",
        email: "sanya@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 65,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.VIKRAM,
        name: "Vikram Singh",
        email: "vikram@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "banjara hills",
        trustScore: 80,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
      {
        id: U.ISHANI,
        name: "Ishani Gupta",
        email: "ishani@gmail.com",
        password: hashed,
        city: "hyderabad",
        zone: "jubilee hills",
        trustScore: 70,
        wantsDailyDigest: true,
        safeCircleIds: [],
      },
    ],
  });

  // ── STEP 4: Insert reports ────────────────────────────────────────────────
  console.log("📋 Inserting reports...");
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo  = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  await prisma.report.createMany({
    data: [

      // ────────────────────────────────────────────────────────────────────
      // CLUSTER 1 — CRITICAL phishing | jubilee hills
      // VERIFIED via duplicates path: 3 child reports → duplicates = 3 ✓
      // Demonstrates: full dedup pipeline, canonical structure, digest generation
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.PHISHING_CANONICAL,
        userId: U.ARJUN,
        rawText: "I received a call claiming to be from SBI asking me to share my OTP to unblock my account. I hung up but this is a scam.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "CRITICAL",
        isVerified: true,       // duplicates = 3 → threshold met
        confirmationCount: 4,   // 1 canonical + 3 duplicates
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(3),
      },
      {
        id: R.PHISHING_DUP_1,
        userId: U.PRIYA,
        rawText: "Got the same scam call from SBI asking for my OTP. Do not share it with anyone.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "CRITICAL",
        isVerified: true,
        canonicalId: R.PHISHING_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(2.8),
      },
      {
        id: R.PHISHING_DUP_2,
        userId: U.KARAN,
        rawText: "Same SBI OTP scam call here. They were very convincing, stay alert.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "CRITICAL",
        isVerified: true,
        canonicalId: R.PHISHING_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(2.5),
      },
      {
        id: R.PHISHING_DUP_3,
        userId: U.ANANYA,
        rawText: "Third report of this SBI OTP scam in our area. Please warn everyone.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "CRITICAL",
        isVerified: true,
        canonicalId: R.PHISHING_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(2.2),
      },

      // ────────────────────────────────────────────────────────────────────
      // CLUSTER 2 — HIGH violence | jubilee hills
      // VERIFIED via combined path: 2 duplicates + 5 verified votes = 7 ✓
      // Demonstrates: combined threshold, vote-based verification
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.VIOLENCE_CANONICAL,
        userId: U.PRIYA,
        rawText: "A man is behaving very aggressively near the community center on Road No 12, intimidating residents passing by.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "violence",
        severity: "HIGH",
        isVerified: true,       // 2 dups + 5 votes = 7 combined → threshold met
        confirmationCount: 3,   // 1 canonical + 2 duplicates
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(7),
      },
      {
        id: R.VIOLENCE_DUP_1,
        userId: U.SANYA,
        rawText: "Confirming this — saw the same person near community center, looks very threatening.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "violence",
        severity: "HIGH",
        isVerified: true,
        canonicalId: R.VIOLENCE_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(6.5),
      },
      {
        id: R.VIOLENCE_DUP_2,
        userId: U.ISHANI,
        rawText: "Still there near the community center. Someone please contact security.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "violence",
        severity: "HIGH",
        isVerified: true,
        canonicalId: R.VIOLENCE_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(6.2),
      },

      // ────────────────────────────────────────────────────────────────────
      // THEFT — MEDIUM | jubilee hills
      // NOT verified. combined = 6 (0 dups + 6 verified votes). Needs 7.
      // 1 AWAY → cast 1 more verified vote to trigger verification + digest
      // Demonstrates: combined threshold, voting path, live demo interaction
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.THEFT_MEDIUM,
        userId: U.ARJUN,
        rawText: "Someone stole a bicycle locked outside the apartment gate on Road No 8 last night. Lock was cut clean.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "theft",
        severity: "MEDIUM",
        isVerified: false,      // combined = 6, needs 7 → 1 away
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(14),
      },

      // ────────────────────────────────────────────────────────────────────
      // GAS LEAK CLUSTER — HIGH infrastructure | banjara hills
      // NOT verified. duplicates = 2. Needs 3.
      // 1 AWAY → submit 1 more gas leak report in banjara hills to trigger
      // Demonstrates: duplicate path, second zone working, live demo interaction
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.GAS_LEAK_CANONICAL,
        userId: U.MEERA,
        rawText: "Strong smell of gas coming from near the main pipeline on Road No 3. Possible leak. Please stay away.",
        city: "hyderabad",
        zone: "banjara hills",
        noiseLabel: "ACTIONABLE",
        category: "infrastructure",
        severity: "HIGH",
        isVerified: false,      // duplicates = 2, needs 3 → 1 away
        confirmationCount: 3,   // 1 canonical + 2 duplicates
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(1),
      },
      {
        id: R.GAS_LEAK_DUP_1,
        userId: U.RAVI,
        rawText: "I can smell gas too near the pipeline junction on Road No 3. This needs urgent attention.",
        city: "hyderabad",
        zone: "banjara hills",
        noiseLabel: "ACTIONABLE",
        category: "infrastructure",
        severity: "HIGH",
        isVerified: false,
        canonicalId: R.GAS_LEAK_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: new Date(daysAgo(1).getTime() + 30 * 60 * 1000),
      },
      {
        id: R.GAS_LEAK_DUP_2,
        userId: U.ADITYA,
        rawText: "Gas smell is very strong near Road No 3 pipeline area. Contacted HMWSSB but no response yet.",
        city: "hyderabad",
        zone: "banjara hills",
        noiseLabel: "ACTIONABLE",
        category: "infrastructure",
        severity: "HIGH",
        isVerified: false,
        canonicalId: R.GAS_LEAK_CANONICAL,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: new Date(daysAgo(1).getTime() + 60 * 60 * 1000),
      },

      // ────────────────────────────────────────────────────────────────────
      // AMBIGUOUS — jubilee hills
      // noiseLabel: AMBIGUOUS. verifiedVotes = 4. Needs 5 to promote.
      // 1 AWAY → cast 1 more verified vote to promote to ACTIONABLE
      // Demonstrates: ambiguous holding state, promotion pipeline
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.AMBIGUOUS_REPORT,
        userId: U.VIKRAM,
        rawText: "A van has been parked outside our building for two days with no markings. No one in it. Not sure if this means anything.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "AMBIGUOUS",
        category: null,
        severity: null,
        isVerified: false,      // verifiedVotes = 4, needs 5 → 1 away from promotion
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(1),
      },

      // ────────────────────────────────────────────────────────────────────
      // VENTING — jubilee hills
      // noiseLabel: VENTING. Stored in DB. Never surfaces in digest feed.
      // Demonstrates: noise filter correctly discarding emotional non-threats
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.VENTING_REPORT,
        userId: U.KARAN,
        rawText: "UGH the traffic on this road is absolutely unbearable every single day!!! Why does nobody fix this???",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "VENTING",
        category: null,
        severity: null,
        isVerified: false,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: hoursAgo(0.5),
      },

      // ────────────────────────────────────────────────────────────────────
      // LOW TRUST PENALTY — jubilee hills (Karan's report)
      // notVerifiedVotes = 9. Needs 10 to mark isFake.
      // 1 AWAY → cast 1 more not_verified vote to flag it fake + penalise Karan
      // Demonstrates: trust score penalty system, fake flagging
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.LOW_TRUST_PENALTY,
        userId: U.KARAN,
        rawText: "I think someone was looking at my car suspiciously near the gate.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "other",
        severity: "LOW",
        isVerified: false,
        confirmationCount: 1,
        isFake: false,          // 9 downvotes currently, 1 away from being marked fake
        isAnonymous: false,
        timestamp: hoursAgo(5),
      },

      // ────────────────────────────────────────────────────────────────────
      // ANONYMOUS REPORT — jubilee hills
      // isAnonymous: true, userId: null
      // Demonstrates: anonymous mode — pipeline runs, no trust score awarded
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.ANONYMOUS_REPORT,
        userId: null,
        rawText: "Received suspicious WhatsApp messages claiming to be from my bank asking to click a link to verify my account.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "MEDIUM",
        isVerified: false,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: true,
        timestamp: hoursAgo(4),
      },

      // ────────────────────────────────────────────────────────────────────
      // TRENDS DATA — spread across 7 days for Recharts dashboard
      // Mix of zones, categories, severities. No associated digests needed.
      // ────────────────────────────────────────────────────────────────────
      {
        id: R.TRENDS_1,
        userId: U.SANYA,
        rawText: "Water logging after light rain near the underpass.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "natural_hazard",
        severity: "LOW",
        isVerified: true,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(2),
      },
      {
        id: R.TRENDS_2,
        userId: U.VIKRAM,
        rawText: "Street lights have been non-functional for 3 nights on the main road.",
        city: "hyderabad",
        zone: "banjara hills",
        noiseLabel: "ACTIONABLE",
        category: "infrastructure",
        severity: "MEDIUM",
        isVerified: true,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(3),
      },
      {
        id: R.TRENDS_3,
        userId: U.ANANYA,
        rawText: "Two-wheeler stolen from parking area near the market.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "theft",
        severity: "MEDIUM",
        isVerified: true,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(4),
      },
      {
        id: R.TRENDS_4,
        userId: U.RAVI,
        rawText: "Phishing email received claiming to be HDFC Bank asking to update KYC details.",
        city: "hyderabad",
        zone: "banjara hills",
        noiseLabel: "ACTIONABLE",
        category: "phishing",
        severity: "HIGH",
        isVerified: true,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(5),
      },
      {
        id: R.TRENDS_5,
        userId: U.ISHANI,
        rawText: "Large pothole on the main road causing traffic issues and vehicle damage.",
        city: "hyderabad",
        zone: "jubilee hills",
        noiseLabel: "ACTIONABLE",
        category: "infrastructure",
        severity: "LOW",
        isVerified: true,
        confirmationCount: 1,
        isFake: false,
        isAnonymous: false,
        timestamp: daysAgo(6),
      },
    ],
  });

  // ── STEP 5: Insert votes ──────────────────────────────────────────────────
  // Rules:
  //   • One vote per user per report (@@unique constraint)
  //   • Report owner should not vote on their own report
  //   • All vote counts must exactly match the "1 away" or "verified" intent
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🗳️  Inserting votes...");
  await prisma.vote.createMany({
    data: [

      // VIOLENCE_CANONICAL — needs 5 verified votes for combined = 7
      // Owner: PRIYA — so PRIYA cannot vote
      // Using: ARJUN, RAVI, MEERA, ADITYA, VIKRAM (5 votes)
      { id: "750e8400-e29b-41d4-a716-446655440000", reportId: R.VIOLENCE_CANONICAL, userId: U.ARJUN,  voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440001", reportId: R.VIOLENCE_CANONICAL, userId: U.RAVI,   voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440002", reportId: R.VIOLENCE_CANONICAL, userId: U.MEERA,  voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440003", reportId: R.VIOLENCE_CANONICAL, userId: U.ADITYA, voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440004", reportId: R.VIOLENCE_CANONICAL, userId: U.VIKRAM, voteType: "verified" },

      // THEFT_MEDIUM — needs 6 verified votes (combined = 6, needs 7 → 1 away)
      // Owner: ARJUN — so ARJUN cannot vote
      // Using: PRIYA, RAVI, MEERA, KARAN, ANANYA, SANYA (6 votes)
      { id: "750e8400-e29b-41d4-a716-446655440010", reportId: R.THEFT_MEDIUM, userId: U.PRIYA,  voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440011", reportId: R.THEFT_MEDIUM, userId: U.RAVI,   voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440012", reportId: R.THEFT_MEDIUM, userId: U.MEERA,  voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440013", reportId: R.THEFT_MEDIUM, userId: U.KARAN,  voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440014", reportId: R.THEFT_MEDIUM, userId: U.ANANYA, voteType: "verified" },
      { id: "750e8400-e29b-41d4-a716-446655440015", reportId: R.THEFT_MEDIUM, userId: U.SANYA,  voteType: "verified" },

      // AMBIGUOUS_REPORT — needs 4 verified votes (needs 5 to promote → 1 away)
      // Owner: VIKRAM — so VIKRAM cannot vote
      // Using: ARJUN, PRIYA, KARAN, SANYA (4 verified) + MEERA (1 not_verified for realism)
      { id: "750e8400-e29b-41d4-a716-446655440020", reportId: R.AMBIGUOUS_REPORT, userId: U.ARJUN, voteType: "verified"     },
      { id: "750e8400-e29b-41d4-a716-446655440021", reportId: R.AMBIGUOUS_REPORT, userId: U.PRIYA, voteType: "verified"     },
      { id: "750e8400-e29b-41d4-a716-446655440022", reportId: R.AMBIGUOUS_REPORT, userId: U.KARAN, voteType: "verified"     },
      { id: "750e8400-e29b-41d4-a716-446655440023", reportId: R.AMBIGUOUS_REPORT, userId: U.SANYA, voteType: "verified"     },
      { id: "750e8400-e29b-41d4-a716-446655440024", reportId: R.AMBIGUOUS_REPORT, userId: U.MEERA, voteType: "not_verified" },

      // LOW_TRUST_PENALTY — needs 9 not_verified votes (needs 10 → 1 away from fake)
      // Owner: KARAN — so KARAN cannot vote
      // Using all other 9 users
      { id: "750e8400-e29b-41d4-a716-446655440030", reportId: R.LOW_TRUST_PENALTY, userId: U.ARJUN,  voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440031", reportId: R.LOW_TRUST_PENALTY, userId: U.PRIYA,  voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440032", reportId: R.LOW_TRUST_PENALTY, userId: U.RAVI,   voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440033", reportId: R.LOW_TRUST_PENALTY, userId: U.MEERA,  voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440034", reportId: R.LOW_TRUST_PENALTY, userId: U.ANANYA, voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440035", reportId: R.LOW_TRUST_PENALTY, userId: U.ADITYA, voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440036", reportId: R.LOW_TRUST_PENALTY, userId: U.SANYA,  voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440037", reportId: R.LOW_TRUST_PENALTY, userId: U.VIKRAM, voteType: "not_verified" },
      { id: "750e8400-e29b-41d4-a716-446655440038", reportId: R.LOW_TRUST_PENALTY, userId: U.ISHANI, voteType: "not_verified" },
    ],
  });

  // ── STEP 6: Insert digests and link recipients ────────────────────────────
  // Only VERIFIED reports get digests.
  // Recipients = all users in the same zone as the digest.
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📰 Inserting digests...");

  // Jubilee Hills users: ARJUN, PRIYA, KARAN, ANANYA, SANYA, ISHANI
  // Banjara Hills users: RAVI, MEERA, ADITYA, VIKRAM

  await prisma.digest.create({
    data: {
      city: "hyderabad",
      zone: "jubilee hills",
      category: "phishing",
      severity: "CRITICAL",
      content: "A phishing scam involving fake SBI bank calls requesting OTPs has been confirmed by multiple residents in Jubilee Hills. The callers are impersonating bank officials and using urgency tactics. No credentials or OTPs should be shared over any unsolicited call.",
      actionSteps: [
        "Never share your OTP, PIN, or password over a phone call regardless of who is calling",
        "Hang up immediately and call back on the official SBI helpline number printed on your card",
        "Report the scam number to cybercrime.gov.in or call 1930",
        "Alert family members — elderly residents are most frequently targeted by these callers",
      ],
      triggeredAt: hoursAgo(2),
      reportId: R.PHISHING_CANONICAL,
      recipients: {
        connect: [
          { id: U.ARJUN },
          { id: U.PRIYA },
          { id: U.KARAN },
          { id: U.ANANYA },
          { id: U.SANYA },
          { id: U.ISHANI },
        ],
      },
    },
  });

  await prisma.digest.create({
    data: {
      city: "hyderabad",
      zone: "jubilee hills",
      category: "violence",
      severity: "HIGH",
      content: "Multiple residents have reported an individual behaving aggressively near the community center on Road No 12 in Jubilee Hills. The situation has been reported to local authorities and the area is being monitored. Residents are advised to use alternate routes temporarily.",
      actionSteps: [
        "Avoid the community center area on Road No 12 until the situation is resolved",
        "Contact local police at 100 if you witness further aggression",
        "Walk in groups if you must pass through that route",
      ],
      triggeredAt: hoursAgo(6),
      reportId: R.VIOLENCE_CANONICAL,
      recipients: {
        connect: [
          { id: U.ARJUN },
          { id: U.PRIYA },
          { id: U.KARAN },
          { id: U.ANANYA },
          { id: U.SANYA },
          { id: U.ISHANI },
        ],
      },
    },
  });

  // ── STEP 7: Insert CircleStatus records ───────────────────────────────────
  // Arjun: SAFE — already updated his status
  // Priya: ALERT — in the affected zone, still monitoring
  // Ravi: no record — demonstrates "no update yet" gray state in circle feed
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🔵 Inserting Circle Status records...");
  await prisma.circleStatus.createMany({
    data: [
      {
        userId: U.ARJUN,
        status: "SAFE",
        message: "I'm okay, working from home today",
      },
      {
        userId: U.PRIYA,
        status: "ALERT",
        message: "Staying indoors, monitoring the situation",
      },
    ],
  });

  // ── STEP 8: Set safeCircleIds ─────────────────────────────────────────────
  // Arjun's circle: Priya (ALERT) + Ravi (no status) → shows all 3 states
  // Priya's circle: Arjun (SAFE)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🔗 Setting Safe Circle memberships...");
  await prisma.user.update({
    where: { id: U.ARJUN },
    data: { safeCircleIds: [U.PRIYA, U.RAVI] },
  });
  await prisma.user.update({
    where: { id: U.PRIYA },
    data: { safeCircleIds: [U.ARJUN] },
  });

  // ── DONE ──────────────────────────────────────────────────────────────────
  console.log("\n✅ Database seeded successfully!");
  console.log("─────────────────────────────────────────────────────");
  console.log("  Demo credentials — all passwords: 123456");
  console.log("─────────────────────────────────────────────────────");
  console.log("  Arjun  (primary demo)  arjun@gmail.com");
  console.log("  Priya                  priya@gmail.com");
  console.log("  Ravi                   ravi@gmail.com");
  console.log("  Meera                  meera@gmail.com");
  console.log("  Karan  (low trust)     karan@gmail.com");
  console.log("  Ananya                 ananya@gmail.com");
  console.log("  Aditya                 aditya@gmail.com");
  console.log("  Sanya                  sanya@gmail.com");
  console.log("  Vikram                 vikram@gmail.com");
  console.log("  Ishani                 ishani@gmail.com");
  console.log("─────────────────────────────────────────────────────");
  console.log("\n  1-away demo triggers:");
  console.log("  → THEFT:     cast 1 verified vote to hit combined = 7");
  console.log("  → GAS LEAK:  submit 1 more report in banjara hills to hit duplicates = 3");
  console.log("  → AMBIGUOUS: cast 1 verified vote to promote to ACTIONABLE");
  console.log("  → KARAN:     cast 1 not_verified vote to mark LOW_TRUST report fake");
  console.log("─────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });