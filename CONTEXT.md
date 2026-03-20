# Nexwatch — Coding Agent Context & Build Plan

## Project Overview

Nexwatch is a community safety and digital wellness platform. It is built as a take-home case study for a Palo Alto Networks New Grad SWE role. The core problem it solves: safety information is scattered, anxiety-inducing, and not actionable. Nexwatch aggregates community safety reports, uses AI to filter noise, verify incidents through community validation, and delivers calm structured safety digests to users in affected areas.


### Evaluation Rubric (build every decision around these)
- **Problem Understanding** — solution clearly addresses the problem statement
- **Technical Rigor** — quality of AI integration, fallback logic, validation, tests
- **Creativity** — originality of features and architecture
- **Prototype Quality** — working end-to-end demo
- **Responsible AI** — awareness of AI limitations, fallback when AI is unavailable or wrong

---

## Tech Stack

```
Frontend          Backend             Database            AI
────────          ────────            ────────            ──────────────────────
React + Vite      Node.js             PostgreSQL          OpenAI GPT-4o-mini
Tailwind CSS      Express.js          Prisma ORM          OpenAI text-embedding-3-small
React Query       REST API            Neon.tech           Rule-based fallback classifier
Recharts          Nodemailer          local database
```


## Environment Variables

### `.env` (never commit this)
```
PORT=3001
DATABASE_URL=
OPENAI_API_KEY=sk-...
SMTP_HOST=
SMTP_PORT=587
SMTP_USER==
SMTP_PASS=
JWT_SECRET=
```

### `.env.example` (commit this first, before anything else)
```
PORT=3001
DATABASE_URL=
OPENAI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
JWT_SECRET=
```

---

## Complete Folder Structure (tentative, subject to change based on requirement)

```
nexwatch/
├── .env
├── .env.example                    
├── .gitignore
├── package.json
├── README.md
│
├── prisma/
│   ├── schema.prisma               ← PostgreSQL datasource
│   └── migrations/
│       └── (auto-generated)
│
├── data/
│   ├── reports.json                ← 30 synthetic reports (seed data)
│   └── users.json                  ← 10 synthetic users (seed data)
│
├── src/
│   ├── index.js                    ← Express app entry point
│   │
│   ├── db/
│   │   ├── client.js               ← Prisma client singleton
│   │   └── seed.js                 ← Reads data/ JSONs, inserts to DB
│   │
│   ├── routes/
│   │   ├── reports.js              ← CRUD + search + filter
│   │   ├── votes.js                ← verified/not_verified voting
│   │   ├── digests.js              ← GET digests by zone
│   │   ├── users.js                ← trust score, safe circles
│   │   └── ingest.js               ← simulated feed ingestion endpoint
│   │
│   ├── services/
│   │   ├── location.js             ← GPS → fuzzy zone label
│   │   ├── dedup.js                ← cosine similarity deduplication
│   │   ├── verify.js               ← 3-report verification trigger
│   │   ├── trust.js                ← trust score increment/decrement
│   │   ├── mailer.js               ← Nodemailer digest + safe circle emails
│   │   └── digestTrigger.js        ← orchestrates digest creation + sending
│   │
│   ├── ai/
│   │   ├── noiseCheck.js           ← GPT: ACTIONABLE / VENTING / AMBIGUOUS
│   │   ├── categorise.js           ← GPT: category + severity + calm_summary
│   │   ├── embed.js                ← OpenAI embeddings for dedup
│   │   ├── digest.js               ← GPT: calm digest + action checklist
│   │   └── fallback.js             ← rule-based classifier (no AI)
│   │
│   └── middleware/
│       ├── validate.js             ← zod input validation
│       └── errorHandler.js         ← global JSON error responses
│
├── tests/
│   ├── reports.test.js             ← happy path + edge cases
│   └── fallback.test.js            ← fallback classifier unit tests
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   └── client.js           ← axios wrapper with base URL + error handling
        └── components/
            ├── DigestFeed.jsx       ← main screen, severity-badged cards
            ├── DigestCard.jsx       ← single digest with action checklist
            ├── SubmitReport.jsx     ← form with geo-tag + anonymous toggle
            ├── ReportDetail.jsx     ← votes, duplicates, AI vs fallback badge
            └── TrendsDashboard.jsx  ← Recharts bar + pie, zone selector
```

---

## Prisma Schema

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(uuid())
  name           String
  email          String    @unique
  zone           String
  trustScore     Int       @default(0)
  safeCircleIds  String[]  @default([])
  isAnonymous    Boolean   @default(false)
  createdAt      DateTime  @default(now())

  reports        Report[]
  votes          Vote[]
  digests        Digest[]  @relation("DigestZoneUsers")
}

model Report {
  id                String    @id @default(uuid())
  userId            String?
  user              User?     @relation(fields: [userId], references: [id])
  rawText           String
  zone              String
  timestamp         DateTime  @default(now())
  noiseLabel        String?   // ACTIONABLE | VENTING | AMBIGUOUS
  category          String?   // phishing | violence | theft | infrastructure | natural_hazard | other
  severity          String?   // CRITICAL | HIGH | MEDIUM | LOW
  calmSummary       String?
  isVerified        Boolean   @default(false)
  canonicalId       String?   // points to the first/canonical report in a duplicate cluster
  confirmationCount Int       @default(1)
  isAnonymous       Boolean   @default(false)
  embedding         String?   // JSON stringified float array
  processedByAI     Boolean   @default(false)
  usedFallback      Boolean   @default(false)
  createdAt         DateTime  @default(now())

  votes             Vote[]
  duplicates        Report[]  @relation("Duplicates")
  canonical         Report?   @relation("Duplicates", fields: [canonicalId], references: [id])
}

model Vote {
  id         String   @id @default(uuid())
  reportId   String
  report     Report   @relation(fields: [reportId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  voteType   String   // verified | not_verified
  createdAt  DateTime @default(now())

  @@unique([reportId, userId])
}

model Digest {
  id           String   @id @default(uuid())
  zone         String
  content      String
  category     String
  severity     String
  actionSteps  String[] @default([])
  triggeredAt  DateTime @default(now())
  sentAt       DateTime?
  reportId     String?
  usedFallback Boolean  @default(false)

  recipients   User[]   @relation("DigestZoneUsers")
}
```

---

## Synthetic Data

### `data/reports.json`
Must contain exactly 30 entries. Cover all 5 categories. Include deliberate noise, duplicates, and one CRITICAL severity cluster for demo purposes.

Required distribution:
- 8 phishing/cyber scam reports (include a 3-report duplicate cluster for the phishing category)
- 5 violence/physical threat reports (include 1 CRITICAL — e.g. active threat)
- 5 theft reports
- 5 infrastructure reports
- 4 natural hazard reports
- 3 deliberate venting/noise entries (frustrated rants with no real incident)
- 5 ambiguous reports

Each entry shape:
```json
{
  "city": "Hyderabad" 
  "isAnonymous": true
  "rawText": "hi im venting right now"
  "zone": "Vittal Rao Nagar"
}
```

Timestamps should be spread across the last 7 days so the trends dashboard has meaningful data.

### `data/users.json`
10 synthetic users. Each has a zone and a pre-set trust score.

```json
{
  "id": "u_001",
  "name": "Arjun Mehta",
  "email": "arjun.mehta@example.com",
  "zone": "Jubilee Hills Zone 2",
  "city": "Hyderabad",
  "trustScore": 45,
}
```

---

## Core Feature Specifications

### 1. Fuzzy Location (`src/services/location.js`)

Never store exact GPS. On every report submission, convert coordinates to a named zone immediately and discard the raw coords.


### 2. AI Noise Pre-Check (`src/ai/noiseCheck.js`)

Every report passes through this before anything else. Returns one of three labels.

```javascript
// Prompt template
const NOISE_PROMPT = `You are a community safety assistant.
Classify the following user report as exactly one of:
- ACTIONABLE: a real safety incident worth alerting the community
- VENTING: frustration, rant, or complaint with no real safety threat
- AMBIGUOUS: unclear, could be real but needs more context

Respond with ONLY the single word classification. No explanation.

Report: "{text}"`;
```

Fallback (when OpenAI call fails):
```javascript
const VENTING_SIGNALS = ['!!!', 'so annoying', 'unbelievable', 'nobody cares',
  'worst', 'terrible', 'ugh', 'omg', 'seriously', 'can you believe'];
const ACTIONABLE_SIGNALS = ['scam', 'fraud', 'robbery', 'attack', 'suspicious',
  'breach', 'phishing', 'stolen', 'fire', 'flood', 'earthquake'];

function fallbackNoiseCheck(text) {
  const lower = text.toLowerCase();
  const ventingScore = VENTING_SIGNALS.filter(s => lower.includes(s)).length;
  const actionableScore = ACTIONABLE_SIGNALS.filter(s => lower.includes(s)).length;
  if (ventingScore > actionableScore) return 'VENTING';
  if (actionableScore > 0) return 'ACTIONABLE';
  return 'AMBIGUOUS';
}
```

### 3. AI Categorisation (`src/ai/categorise.js`)

Only runs on ACTIONABLE reports. Returns structured JSON.

```javascript
const CATEGORISE_PROMPT = `You are a community safety assistant.
Analyse this safety report and return ONLY a JSON object with these exact fields:
{
  "category": one of ["phishing", "violence", "theft", "infrastructure", "natural_hazard", "other"],
  "severity": one of ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  "calmSummary": "a single calm factual summary in a few sentences, no alarming language"
}

Severity guide:
- CRITICAL: immediate threat to life or safety, active situation
- HIGH: significant threat, scam wave, break-in, active phishing campaign
- MEDIUM: suspicious activity, resolved incident, local infrastructure issue
- LOW: minor nuisance, unverified single report
- NONE: no real incident

Report: "{text}"`;
```

Fallback keyword classifier in `src/ai/fallback.js`:
```javascript
const CATEGORY_KEYWORDS = {
  phishing:        ['otp', 'phishing', 'scam call', 'fraud', 'gift card', 'bank account', 'password', 'verify your'],
  violence:        ['attack', 'assault', 'knife', 'gun', 'robbery', 'fight', 'threatening', 'shooting'],
  theft:           ['stolen', 'theft', 'pickpocket', 'burglary', 'break-in', 'snatched', 'missing'],
  infrastructure:  ['power cut', 'water supply', 'road', 'pothole', 'streetlight', 'gas leak', 'pipeline'],
  natural_hazard:  ['flood', 'fire', 'earthquake', 'cyclone', 'landslide', 'lightning', 'storm'],
};

const SEVERITY_KEYWORDS = {
  CRITICAL: ['active', 'right now', 'happening now', 'emergency', 'immediately', 'armed'],
  HIGH:     ['just happened', 'multiple', 'several', 'spreading', 'ongoing'],
  LOW:      ['minor', 'small', 'not sure', 'maybe', 'possibly', 'heard that'],
};

export function fallbackCategorise(text) {
  const lower = text.toLowerCase();
  let category = 'other';
  let severity = 'MEDIUM';
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) { category = cat; break; }
  }
  if (SEVERITY_KEYWORDS.CRITICAL.some(k => lower.includes(k))) severity = 'CRITICAL';
  else if (SEVERITY_KEYWORDS.HIGH.some(k => lower.includes(k))) severity = 'HIGH';
  else if (SEVERITY_KEYWORDS.LOW.some(k => lower.includes(k))) severity = 'LOW';
  const calmSummary = `A ${category.replace('_', ' ')} incident has been reported in this area.`;
  return { category, severity, calmSummary, usedFallback: true };
}
```

### 4. Semantic Deduplication (`src/ai/embed.js` + `src/services/dedup.js`)

When a new ACTIONABLE report is submitted, generate its embedding and compare against recent reports in the same zone.

```javascript
// embed.js — get embedding from OpenAI
export async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding; // float[]
}

// dedup.js — cosine similarity check
export function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export async function findCanonical(newEmbedding, zone, prisma) {
  const THRESHOLD = 0.85;
  const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recent = await prisma.report.findMany({
    where: { zone, canonicalId: null, createdAt: { gte: SIX_HOURS_AGO }, noiseLabel: 'ACTIONABLE' },
    select: { id: true, embedding: true },
  });
  for (const report of recent) {
    if (!report.embedding) continue;
    const existingEmbedding = JSON.parse(report.embedding);
    const sim = cosineSimilarity(newEmbedding, existingEmbedding);
    if (sim >= THRESHOLD) return report.id; // this is the canonical
  }
  return null;
}
```

If embeddings API fails: skip dedup, report enters pipeline as a standalone canonical report.

### 5. Verification Trigger (`src/services/verify.js`)

Runs after every report insertion. Checks if a canonical report now has enough duplicates.

```javascript
export async function checkVerification(canonicalId, prisma) {
  const canonical = await prisma.report.findUnique({ where: { id: canonicalId } });
  if (canonical.isVerified) return; // already verified
  const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const firstReportTime = canonical.createdAt;
  const duplicates = await prisma.report.count({
    where: { canonicalId, createdAt: { gte: firstReportTime, lte: new Date(firstReportTime.getTime() + 2*60*60*1000) } }
  });
  if (duplicates >= 3) {
    await prisma.report.update({
      where: { id: canonicalId },
      data: { isVerified: true }
    });
    // Award trust score to first reporter
    if (canonical.userId && !canonical.isAnonymous) {
      await prisma.user.update({
        where: { id: canonical.userId },
        data: { trustScore: { increment: 10 } }
      });
    }
    // Trigger digest
    await triggerDigest(canonical, prisma);
  }
}
```

### 6. Severity Escalation Rules

```
CRITICAL → trigger digest immediately at 2 confirmed reports within 30 minutes
HIGH     → trigger digest at 3 confirmed reports within 2 hours  
MEDIUM   → add to weekly zone summary, no immediate digest
LOW      → log only, no digest, no alert
```

### 7. Voting System (`src/routes/votes.js`)

```
POST /api/reports/:id/vote
Body: { userId, voteType: "verified" | "not_verified" }

Rules:
- One vote per user per report (enforced by @@unique in schema)
- After insert, run vote consequence check:
  - Count verified votes in last 5 hours
  - If >= 5: award trust bonus (+5) to first reporter (if not anonymous)
  - Count not_verified votes total
  - If >= 10: apply heavy trust penalty (-20) to first reporter
```

### 8. Trust Score Rules

```
+10  — first reporter when report reaches 3-report verification
+5   — first reporter when report reaches 5 verified votes within 5 hours
-20  — first reporter when report receives 10+ not_verified votes
 0   — anonymous reports never affect trust score in any direction
```

### 9. Digest Generation (`src/ai/digest.js`)

Only triggered for CRITICAL and HIGH severity verified reports.

```javascript
const DIGEST_PROMPT = `You are a calm community safety assistant.
A safety incident has been verified in a neighbourhood.
Write a community safety digest that:
1. Describes the situation in ONE calm, factual sentence (no alarming language)
2. Provides exactly 3 actionable steps residents can take right now
3. Uses reassuring, empowering language — never panic-inducing

Return ONLY a JSON object:
{
  "content": "calm one-sentence summary",
  "actionSteps": ["step 1", "step 2", "step 3"]
}

Incident category: {category}
Incident summary: {calmSummary}
Zone: {zone}`;
```

Fallback templates by category:
```javascript
const FALLBACK_TEMPLATES = {
  phishing: {
    content: 'A scam or phishing attempt has been reported in your area.',
    actionSteps: [
      'Do not respond to unsolicited calls asking for OTP, passwords, or gift cards',
      'Hang up and call back on the official number if in doubt',
      'Report suspicious numbers to your bank and cybercrime.gov.in'
    ]
  },
  violence: {
    content: 'An incident has been reported in your area — please stay alert.',
    actionSteps: [
      'Avoid the reported area until authorities confirm it is clear',
      'Stay in well-lit, populated areas',
      'Contact local police at 100 if you witness anything suspicious'
    ]
  },
  theft: {
    content: 'Theft activity has been reported in your neighbourhood.',
    actionSteps: [
      'Keep valuables secure and avoid displaying them in public',
      'Ensure your home is locked, including windows',
      'Report suspicious persons to local police at 100'
    ]
  },
  infrastructure: {
    content: 'An infrastructure issue has been reported in your area.',
    actionSteps: [
      'Avoid the affected area if possible',
      'Report to local municipal helpline',
      'Check official channels for updates'
    ]
  },
  natural_hazard: {
    content: 'A natural hazard has been reported near your area.',
    actionSteps: [
      'Follow official advisories and stay indoors if advised',
      'Keep emergency contacts and supplies ready',
      'Monitor official weather and disaster management channels'
    ]
  },
  other: {
    content: 'A community safety alert has been issued for your area.',
    actionSteps: [
      'Stay alert and aware of your surroundings',
      'Report further incidents through the Nexwatch app',
      'Contact local authorities if you feel unsafe'
    ]
  }
};
```

### 10. Safe Circles Email (`src/services/mailer.js`)

CRITICAL digests only. Send a private ping to the reporter's Safe Circle contacts. Email contains no location data.

```
Subject: "Check in with [Reporter Name]"
Body: "[Reporter Name] reported a critical safety incident near their area.
       This is a private message — please check in with them."
```

---

## API Route Specifications

### Reports

```
POST   /api/reports
  Body: { rawText, userId?, lat, lng, isAnonymous }
  - Validate: rawText required, min 10 chars
  - Convert GPS to zone immediately, discard coords
  - Run AI noise check → if VENTING, store but mark, return 201
  - If ACTIONABLE: run categorise, embed, dedup, verify check
  Returns: { report }

GET    /api/reports
  Query: zone?, category?, severity?, isVerified?, dateFrom?, dateTo?, limit?, offset?
  Returns: { reports, total }

GET    /api/reports/:id
  Returns: { report, voteCount, duplicateCount }

PATCH  /api/reports/:id
  Body: { category?, severity? }   ← manual override
  Returns: { report }
```

### Votes

```
POST   /api/reports/:id/vote
  Body: { userId, voteType }
  - Prevent duplicate vote (unique constraint)
  - Run vote consequence check
  Returns: { vote, verifiedCount, notVerifiedCount }

GET    /api/reports/:id/votes
  Returns: { verifiedCount, notVerifiedCount }
```

### Digests

```
GET    /api/digests
  Query: zone?, limit?, offset?
  Returns: { digests }

GET    /api/digests/:id
  Returns: { digest }
```

### Users

```
GET    /api/users/:id
  Returns: { user, trustScore }

PATCH  /api/users/:id/safe-circle
  Body: { safeCircleIds: string[] }   ← max 5 IDs
  Returns: { user }
```

### Stats

```
GET    /api/stats/:zone
  Returns: {
    categoryCounts: { phishing: N, violence: N, ... },
    severityCounts: { CRITICAL: N, HIGH: N, MEDIUM: N, LOW: N },
    last7Days: [ { date, count }... ]
  }
```

### Ingest

```
POST   /api/ingest/simulate
  - Reads data/reports.json
  - Inserts a batch of 5 random unprocessed reports with randomised recent timestamps
  - Triggers full AI pipeline on each
  Returns: { inserted: N }
```

---

## Frontend Component Specifications

### `DigestFeed.jsx`
- Main screen. Fetches `GET /api/digests?zone={userZone}`
- Shows DigestCard for each digest
- Empty state when no digests exist
- Refresh button that calls `POST /api/ingest/simulate` and refetches

### `DigestCard.jsx`
- Severity badge: CRITICAL=red, HIGH=amber, MEDIUM=blue, LOW=gray
- Calm summary text (large, readable)
- Expandable action checklist (chevron toggle)
- Timestamp and zone label
- "AI Generated" or "Rule-based" small indicator badge

### `SubmitReport.jsx`
- Textarea (min 10 chars, show char count)
- Geo-tag toggle: when on, calls `navigator.geolocation.getCurrentPosition`
- Anonymous toggle: clearly labelled "submit without earning trust score"
- Submit button
- Success state: calm confirmation "Your report has been received and is being reviewed"
- Error state: inline validation messages

### `ReportDetail.jsx`
- Full report details
- Verified / Not Verified vote buttons with running counts
- Confirmation count badge
- List of linked duplicate reports (if any)
- "AI processed" vs "Fallback used" badge
- Manual override section (category + severity dropdowns)

### `TrendsDashboard.jsx`
- Zone selector dropdown
- Recharts BarChart: category breakdown, last 7 days
- Recharts PieChart: severity distribution
- Summary stats row: total reports, verified count, most common category

---

## Test Specifications

### `tests/reports.test.js`

**Test 1 — Happy path (required for rubric)**
```
1. POST /api/reports with valid text, userId, lat, lng
2. Assert 201 response
3. Assert report has noiseLabel, category, severity fields populated
4. POST two more identical reports within the same zone
5. Assert canonical report isVerified becomes true
6. Assert a digest was created in the digests table
```

**Test 2 — Edge case: empty input validation**
```
1. POST /api/reports with rawText: ""
2. Assert 400 response
3. Assert error message mentions rawText
```

**Test 3 — Edge case: AI down, fallback runs**
```
1. Mock OpenAI to throw an error
2. POST /api/reports with valid ACTIONABLE text
3. Assert 201 response (pipeline did not crash)
4. Assert report has usedFallback: true
5. Assert category and severity are still populated
```

**Test 4 — Edge case: duplicate vote rejected**
```
1. POST /api/reports/:id/vote with userId + voteType
2. POST same vote again (same userId, same reportId)
3. Assert second POST returns 409
```

### `tests/fallback.test.js`
Unit tests for the rule-based classifier — no HTTP, no DB needed:
```
- fallbackNoiseCheck("UGH nobody cares!!!") → VENTING
- fallbackNoiseCheck("Got a scam call asking for OTP") → ACTIONABLE
- fallbackCategorise("OTP fraud bank account") → { category: "phishing", severity: "MEDIUM" }
- fallbackCategorise("knife attack happening right now") → { category: "violence", severity: "CRITICAL" }
```

Install: `npm install --save-dev jest supertest @jest/globals`

---

## Build Order

```
Step 1   Init repo, install all dependencies, commit .env.example
Step 2   Write prisma/schema.prisma, run: npx prisma migrate dev --name init
Step 3   Create data/reports.json (30 entries) and data/users.json (10 entries)
Step 4   Write src/db/seed.js and run it: node src/db/seed.js
Step 5   Write src/middleware/validate.js and src/middleware/errorHandler.js
Step 6   Write src/services/location.js (GPS → zone)
Step 7   Write src/ai/fallback.js (full rule-based classifier)
Step 8   Write src/ai/noiseCheck.js (AI + fallback wired together)
Step 9   Write src/ai/categorise.js (AI + fallback wired together)
Step 10  Write src/ai/embed.js and src/services/dedup.js
Step 11  Write src/services/trust.js and src/services/verify.js
Step 12  Write src/routes/reports.js (full pipeline in POST handler)
Step 13  Write src/routes/votes.js
Step 14  Write src/ai/digest.js + fallback templates
Step 15  Write src/services/mailer.js and src/services/digestTrigger.js
Step 16  Write src/routes/digests.js, src/routes/users.js, src/routes/ingest.js
Step 17  Write src/index.js, wire all routes, test with curl
Step 18  Write tests/fallback.test.js (unit tests, no DB needed)
Step 19  Write tests/reports.test.js (integration tests)
Step 20  Run all tests: npm test — all must pass
Step 21  Scaffold frontend: npm create vite@latest frontend -- --template react
Step 22  Build DigestFeed + DigestCard
Step 23  Build SubmitReport form with geolocation + anonymous toggle
Step 24  Build ReportDetail with voting
Step 25  Build TrendsDashboard with Recharts
Step 26  Fill README.md using the template from the instructions PDF
Step 27  Record 5-7 minute demo video
```

---

## package.json Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "nodemailer": "^6.9.0",
    "openai": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@jest/globals": "^29.0.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0",
    "supertest": "^6.3.0"
  },
  "scripts": {
    "dev": "node --watch src/index.js",
    "seed": "node src/db/seed.js",
    "test": "jest --runInBand",
    "migrate": "npx prisma migrate dev"
  }
}
```

---

## README Template (fill before submission)

```markdown
# Nexwatch

**Candidate Name:** [Your Name]
**Scenario Chosen:** 3 — Community Safety & Digital Wellness
**Estimated Time Spent:** ~12 hours

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon.tech free tier recommended)
- OpenAI API key

### Run Commands
```bash
git clone <repo>
cd nexwatch
cp .env.example .env      # fill in your values
npm install
npx prisma migrate dev
npm run seed
npm run dev               # starts Express on PORT 3001

cd frontend
npm install
npm run dev               # starts Vite on PORT 5173
```

### Test Commands
```bash
npm test
```

## AI Disclosure
- **AI tools used:** [list tools]
- **How verified:** [how you checked suggestions]
- **Example of rejected suggestion:** [one concrete example]

## Tradeoffs & Prioritisation
- **What was cut:** [e.g. JWT auth, real-time websocket alerts]
- **What to build next:** [e.g. mobile app, CISA feed integration, real embeddings DB]
- **Known limitations:** [e.g. embedding storage in Postgres JSON column not optimised for similarity search at scale — would use pgvector in production]
```

---

## Responsible AI Notes (mention in README and video)

These points directly score the **Responsible AI** rubric pillar:

1. **AI can hallucinate severity** — a LOW threat could be misclassified as CRITICAL. The manual override endpoint (`PATCH /api/reports/:id`) exists specifically to correct AI mistakes.

2. **Fallback is always on standby** — every single AI call is wrapped in try/catch. If OpenAI is unavailable, the rule-based classifier in `fallback.js` runs transparently. The report's `usedFallback` field records which path ran, shown as a badge in the UI.

3. **Fuzzy location by design** — exact GPS coordinates are never stored. This is not a limitation, it is a deliberate privacy decision.

4. **Trust scores can be gamed** — acknowledged limitation. Production mitigation would be rate limiting, phone verification, and ML-based bot detection.

5. **Embeddings at scale** — storing embedding vectors as JSON strings in Postgres is fine for demo but would need `pgvector` extension for production similarity search at scale.



If an AMBIGUOUS report receives 5+ verified votes within 5 hours → promote it to ACTIONABLE, then run the verification and digest logic on it
If it receives 10+ not_verified votes → demote it to VENTING, apply the trust penalty, done