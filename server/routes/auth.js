import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { validateBody } from "../src/middleware/validate.js";
import { requireAuth } from "../src/middleware/auth.js";
import { reverseGeocode } from "../src/services/location.js";

export const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().optional(),
  zone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  city: z.string().optional(),
  zone: z.string().optional()
});

authRouter.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { fullName, email, password, city: manualCity, zone: manualZone } = req.validatedBody;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: { message: "Email already exists" } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let zone = manualZone || "General Zone";
    let city = manualCity || "Unknown";

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        city: city.toLowerCase(),
        zone: zone.toLowerCase()
      },
      include: { circleStatus: true }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        zone: user.zone, 
        city: user.city,
        circleStatus: user.circleStatus 
      }, 
      token 
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, city: manualCity, zone: manualZone } = req.validatedBody;

    let user = await prisma.user.findUnique({ 
      where: { email },
      include: { circleStatus: true }
    });
    if (!user) {
      return res.status(401).json({ error: { message: "Invalid email or password" } });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: { message: "Invalid email or password" } });
    }

    let targetZone = manualZone || user.zone;
    let targetCity = manualCity || user.city;

    if (manualZone || manualCity) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          zone: targetZone.toLowerCase(),
          city: targetCity.toLowerCase()
        },
        include: { circleStatus: true }
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        zone: user.zone, 
        city: user.city,
        circleStatus: user.circleStatus 
      }, 
      token 
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId }, 
      select: { 
        id:true, 
        name:true, 
        email:true, 
        zone:true, 
        city:true, 
        trustScore:true,
        circleStatus: true 
      } 
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
