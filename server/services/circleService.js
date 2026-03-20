import { prisma } from "../src/lib/prisma.js";
import { createTransporter } from "../src/services/mailer.js";

/**
 * Notifies Safe Circle members when a member is near a verified incident.
 */
export async function notifyCircleOfIncident(reporterId, zone) {
  console.log(`[Service:Circle] Sending incident pings for reporter: ${reporterId} in zone: ${zone}`);
  try {
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
      select: { name: true, safeCircleIds: true }
    });

    if (!reporter || !reporter.safeCircleIds || reporter.safeCircleIds.length === 0) {
      console.log(`[Service:Circle] Reporter ${reporterId} has no Safe Circle members. Skipping.`);
      return;
    }

    if (!(process.env.SMTP_HOST || process.env.SMTP_USER)) {
      console.log(`[Service:Circle] Skipping emails: No SMTP configured.`);
      return;
    }

    const circleMembers = await prisma.user.findMany({
      where: { id: { in: reporter.safeCircleIds } },
      select: { email: true, name: true }
    });

    const transporter = await createTransporter();
    for (const member of circleMembers) {
      if (!member.email) continue;

      const subject = `Safe Circle Alert: ${reporter.name} is near an incident`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #e11d48;">Safe Circle Incident Alert</h2>
          <p>Hello <strong>${member.name}</strong>,</p>
          <p>A critical alert was reported in <strong>${zone}</strong>.</p>
          <p>Your Safe Circle member, <strong>${reporter.name}</strong>, is near that area. Please check the Nexwatch app to verify their safety status.</p>
          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">This is an automated safety check-in from Nexwatch.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@example.com",
        to: member.email,
        subject,
        html
      });
      console.log(`[Service:Circle] Incident alert sent to ${member.name}`);
    }
  } catch (err) {
    console.error("[Service:Circle] Error in notifyCircleOfIncident:", err);
  }
}

/**
 * Notifies Safe Circle members of a manual status change (e.g., NEED_HELP).
 */
export async function notifyCircleOfStatusChange(userId, status, message) {
  if (status !== 'NEED_HELP') return; // Only notify for NEED_HELP for now

  console.log(`[Service:Circle] Sending HELP alert for user: ${userId}`);
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, zone: true, safeCircleIds: true }
    });

    if (!user || !user.safeCircleIds || user.safeCircleIds.length === 0) {
      console.log(`[Service:Circle] User ${userId} has no Safe Circle members. Skipping.`);
      return;
    }

    if (!(process.env.SMTP_HOST || process.env.SMTP_USER)) {
      console.log(`[Service:Circle] Skipping emails: No SMTP configured.`);
      return;
    }

    const circleMembers = await prisma.user.findMany({
      where: { id: { in: user.safeCircleIds } },
      select: { email: true, name: true }
    });

    const transporter = await createTransporter();
    for (const member of circleMembers) {
      if (!member.email) continue;

      const subject = `URGENT: ${user.name} needs help!`;
      const html = `
        <div style="font-family: sans-serif; padding: 30px; border: 2px solid #ef4444; border-radius: 12px; max-width: 600px; background-color: #fef2f2;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #ef4444; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Urgent Help Request</span>
          </div>
          <h1 style="color: #991b1b; margin-top: 0; text-align: center;">${user.name} needs help</h1>
          <p style="font-size: 16px; color: #450a0a;">Hello <strong>${member.name}</strong>,</p>
          <p style="font-size: 16px; color: #450a0a; line-height: 1.5;">
            Your Safe Circle member, <strong>${user.name}</strong>, has updated their status to <strong style="color: #ef4444;">NEED HELP</strong>.
          </p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #fee2e2; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #991b1b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Message from ${user.name}:</p>
            <p style="margin: 0; font-size: 18px; color: #111827; font-style: italic; line-height: 1.6;">
              "${message || 'No specific message provided.'}"
            </p>
          </div>

          <p style="font-size: 14px; color: #7f1d1d;">
            <strong>Current Location:</strong> ${user.zone || 'Unknown Zone'}<br>
            <strong>Last Updated:</strong> ${new Date().toLocaleString()}
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || '#'}" style="background-color: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Nexwatch App</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #991b1b; border-top: 1px solid #fee2e2; pt: 15px;">
            Please contact ${user.name} directly or check their status on the Nexwatch platform.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@example.com",
        to: member.email,
        subject,
        html
      });
      console.log(`[Service:Circle] HELP alert sent to ${member.name}`);
    }
    console.log(`[Service:Circle] ✅ COMPLETED: HELP pings sent for ${user.name}`);
  } catch (err) {
    console.error("[Service:Circle] ❌ ERROR: Failed to process HELP status alert:", err);
  }
}
