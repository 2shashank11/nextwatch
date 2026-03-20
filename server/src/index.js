import "dotenv/config";
import express from "express";
import cors from "cors";
import { reportsRouter } from "../routes/reports.js";
import { votesRouter } from "../routes/votes.js";
import { digestsRouter } from "../routes/digests.js";
import { usersRouter } from "../routes/users.js";
import { statsRouter } from "../routes/stats.js";
import { authRouter } from "../routes/auth.js";
import { circlesRouter } from "../routes/circles.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import { startDailyDigestCron } from "../services/cron.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/circles", requireAuth, circlesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/votes", votesRouter);
app.use("/api/digests", digestsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/stats", statsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 3001);

if (process.env.NODE_ENV !== "test") {
  startDailyDigestCron();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export { app };
