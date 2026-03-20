import express from 'express';
import { z } from 'zod';
import { prisma } from '../src/lib/prisma.js';
import { validateBody } from '../src/middleware/validate.js';

export const circlesRouter = express.Router();

// 1. Search Users
circlesRouter.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query || typeof query !== 'string') {
      return res.json({ users: [] });
    }

    const currentUserId = req.user?.userId;

    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
        id: {
          not: currentUserId // don't return yourself
        }
      },
      select: {
        id: true,
        name: true,
        zone: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// 2. Update Members (Max 5)
const membersSchema = z.object({
  safeCircleIds: z.array(z.string().uuid()).max(5, "You can have a maximum of 5 people in your Safe Circle."),
});

circlesRouter.patch('/members', validateBody(membersSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { safeCircleIds } = req.validatedBody;

    console.log(`[API:Circles] User ${userId} updating Safe Circle members...`);
    // Verify all IDs actually exist
    const validUsers = await prisma.user.findMany({
      where: { id: { in: safeCircleIds } },
      select: { id: true }
    });
    
    const validIds = validUsers.map(u => u.id);
    console.log(`[API:Circles] Found ${validIds.length}/${safeCircleIds.length} valid user IDs.`);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { safeCircleIds: validIds },
    });
    console.log(`[API:Circles] Safe Circle members updated successfully for user ${userId}.`);

    res.json({ safeCircleIds: user.safeCircleIds });
  } catch (err) {
    next(err);
  }
});

// 3. Set Own Status
const statusSchema = z.object({
  status: z.enum(['SAFE', 'ALERT', 'NEED_HELP']),
  message: z.string().optional(),
});

circlesRouter.post('/status', validateBody(statusSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, message } = req.validatedBody;

    console.log(`[API:Circles] User ${userId} updating status to: ${status} (message: "${message || 'none'}")`);
    const circleStatus = await prisma.circleStatus.upsert({
      where: { userId },
      update: { status, message },
      create: { userId, status, message },
    });
    console.log(`[API:Circles] Status updated successfully for user ${userId}.`);

    // Trigger urgent email if status is NEED_HELP
    if (status === 'NEED_HELP') {
      import('../services/circleService.js').then(({ notifyCircleOfStatusChange }) => {
        notifyCircleOfStatusChange(userId, status, message);
      }).catch(err => {
        console.error("[API:Circles] Failed to load circleService for help alert:", err);
      });
    }

    res.json({ circleStatus });
  } catch (err) {
    next(err);
  }
});

// 4. Get Feed (Private Feed of Members)
circlesRouter.get('/feed', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Get the user's circle IDs
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { safeCircleIds: true }
    });

    if (!currentUser || !currentUser.safeCircleIds || currentUser.safeCircleIds.length === 0) {
      return res.json({ feed: [] });
    }

    // Fetch only the allowed public-display info and their status
    const circleMembers = await prisma.user.findMany({
      where: {
        id: { in: currentUser.safeCircleIds }
      },
      select: {
        id: true,
        name: true,
        zone: true,
        circleStatus: {
          select: {
            status: true,
            message: true,
            updatedAt: true,
          }
        }
      }
    });

    // Map response securely
    const feed = circleMembers.map(member => ({
      id: member.id,
      name: member.name,
      zone: member.zone || 'Unknown Zone',
      status: member.circleStatus?.status || null,
      message: member.circleStatus?.message || null,
      updatedAt: member.circleStatus?.updatedAt || null,
    }));

    res.json({ feed });
  } catch (err) {
    next(err);
  }
});
