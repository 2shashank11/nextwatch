import cron from 'node-cron';
import { prisma } from '../src/lib/prisma.js';
import { createTransporter } from '../src/services/mailer.js';

export function startDailyDigestCron() {
  console.log("Starting daily digest cron job (scheduled for 9:00 AM)");

  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log("Running Daily Digest Cron Job");
    try {
      const users = await prisma.user.findMany({
        where: { wantsDailyDigest: true, zone: { not: null } }
      });

      if (users.length === 0) return;

      const transporter = await createTransporter();
      if (!transporter) {
        console.log("SMTP not configured, skipping daily digest emails.");
        return;
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Group users by zone to optimize database queries
      const zoneMap = new Map();
      users.forEach(user => {
        if (!zoneMap.has(user.zone)) {
          zoneMap.set(user.zone, []);
        }
        zoneMap.get(user.zone).push(user);
      });

      for (const [zone, zoneUsers] of zoneMap.entries()) {
        const dailyDigests = await prisma.digest.findMany({
          where: {
            zone: zone,
            triggeredAt: { gte: twentyFourHoursAgo }
          },
          orderBy: { triggeredAt: 'desc' }
        });

        if (dailyDigests.length === 0) continue; // No alerts for this zone today

        const digestCount = dailyDigests.length;
        const subject = `Your Nexwatch morning brief — ${digestCount} new alert${digestCount === 1 ? '' : 's'} in ${zone}`;

        const htmlBody = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 32px 24px;">
                <h1 style="color: #0f172a; margin: 0 0 16px; font-size: 24px; font-weight: 800;">Morning Security Brief</h1>
                <p style="color: #475569; font-size: 16px; margin: 0 0 32px;">Here is your daily summary of verified safety incidents in <strong>${zone}</strong> from the last 24 hours.</p>
                
                ${dailyDigests.map(d => `
                  <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: inline-block; background-color: ${d.severity === 'CRITICAL' ? '#fee2e2' : '#f1f5f9'}; color: ${d.severity === 'CRITICAL' ? '#991b1b' : '#334155'}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 8px;">
                      ${d.severity} / ${d.category}
                    </div>
                    <p style="color: #1e293b; font-size: 15px; font-weight: 500; margin: 0 0 8px;">"${d.content}"</p>
                    <ul style="padding-left: 20px; margin: 0; color: #475569; font-size: 14px;">
                      ${d.actionSteps.map(step => `<li>${step}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
                
                <div style="text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px;">
                  Stay safe, The Nexwatch Team
                </div>
              </div>
            </body>
          </html>
        `;

        for (const user of zoneUsers) {
          if (!user.email) continue;
          await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: user.email,
            subject,
            html: htmlBody,
          });
        }
      }
      
      console.log("Daily target digests broadcast completed.");
    } catch (error) {
      console.error("Error running daily digest cron:", error);
    }
  });
}
