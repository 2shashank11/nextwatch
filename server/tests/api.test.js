import request from "supertest";
import { app } from "../src/index.js";
import { prisma } from "../src/lib/prisma.js";
import { clearDatabase } from "./testHelpers.js";

describe("API Tests", () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Health Check", () => {
    it("should return 200 OK", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  describe("Auth Routes", () => {
    const testUser = {
      fullName: "Test User",
      email: "test@example.com",
      password: "123456",
      city: "San Francisco",
      zone: "Downtown"
    };

    it("should register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);
      
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body).toHaveProperty("token");
    });

    it("should not register a user with an existing email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);
      
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Email already exists");
    });

    it("should login a user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body).toHaveProperty("token");
    });

    it("should return the current user profile", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const token = loginRes.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);
    });
  });

  describe("Reports Routes", () => {
    it("should list reports", async () => {
      const res = await request(app).get("/api/reports");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it("should create a new report when authenticated", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "123456"
        });
      
      const token = loginRes.body.token;

      const reportData = {
        rawText: "Suspicious activity near the main gate. Possible phishing attempt.",
        zone: "Downtown",
        city: "San Francisco",
        isAnonymous: false
      };

      const res = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send(reportData);
      
      expect(res.status).toBe(201);
      expect(res.body.report.rawText).toBe(reportData.rawText);
      expect(res.body.report.userId).toBe(loginRes.body.user.id);
    }, 30000);

    it("should fail to create a report if not authenticated", async () => {
      const reportData = {
        rawText: "Another report text that should fail.",
        zone: "Downtown",
        city: "San Francisco"
      };

      const res = await request(app)
        .post("/api/reports")
        .send(reportData);
      
      expect(res.status).toBe(401);
    });
  });
});
