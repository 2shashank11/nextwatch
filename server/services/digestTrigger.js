import { prisma } from "../src/lib/prisma.js";
import { generateDigest } from "../ai/digest.js";
import { createTransporter } from "../src/services/mailer.js";



export async function triggerDigest(canonicalReport) {
  console.log(`[Service:DigestTrigger] triggerDigest(id: ${canonicalReport.id}) – Starting pipeline`);
  if (!canonicalReport.category) {
    console.log(`[Service:DigestTrigger] Aborting: Missing category for report ${canonicalReport.id}`);
    return;
  }
  if (!canonicalReport.zone) {
    console.log(`[Service:DigestTrigger] Aborting: Missing zone for report ${canonicalReport.id}`);
    return;
  }

  const { category, severity, zone, city, id } = canonicalReport;

  console.log(`[Service:DigestTrigger] Generating digest content via AI for report: ${id}`);
  const { content, actionSteps } = await generateDigest(canonicalReport);
  console.log(`[Service:DigestTrigger] AI Digest Generation COMPLETE for report: ${id}`);

  console.log(`[Service:DigestTrigger] Searching for recipients in zone: "${zone}" (also including participants of report ${id})`);
  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { zone: { equals: zone, mode: "insensitive" } },
        { reports: { some: { OR: [{ id }, { canonicalId: id }] } } },
        { votes: { some: { report: { OR: [{ id }, { canonicalId: id }] } } } },
      ],
    },
    select: { id: true, email: true, name: true },
  });
  console.log(`[Service:DigestTrigger] Found ${recipients.length} matching recipients for zone alert.`);

  console.log(`[Service:DigestTrigger] Creating database record for digest...`);
  const digest = await prisma.digest.create({
    data: {
      zone,
      city,
      content,
      category,
      severity,
      actionSteps,
      reportId: id,
      recipients: {
        connect: recipients.map((u) => ({ id: u.id })),
      },
    },
  });
  console.log(`[Service:DigestTrigger] Digest record created successfully (ID: ${digest.id})`);

  // --- SAFE CIRCLE PRIVATE PING ---
  if (canonicalReport.userId && !canonicalReport.isAnonymous) {
    import('./circleService.js').then(({ notifyCircleOfIncident }) => {
      notifyCircleOfIncident(canonicalReport.userId, zone);
    }).catch(err => {
      console.error("[Service:DigestTrigger] Failed to load circleService:", err);
    });
  }
  // --------------------------------

  if (process.env.SMTP_HOST || process.env.SMTP_USER) {
    const transporter = await createTransporter();

    const subject = `Nexwatch Alert: ${severity} ${category.replace("_", " ")} in ${zone}, ${city}`;
    
    for (const recipient of recipients) {
      if (!recipient.email) continue;
      
      const severityColors = {
        CRITICAL: { bg: "#fee2e2", text: "#991b1b", border: "#f87171" },
        HIGH: { bg: "#ffedd5", text: "#9a3412", border: "#fb923c" },
        MEDIUM: { bg: "#fef9c3", text: "#854d0e", border: "#facc15" },
      };
      const colors = severityColors[severity] || { bg: "#f0f9ff", text: "#075985", border: "#38bdf8" };

      const body = `Hello ${recipient.name},

A new safety digest has been issued for your area or an incident you're involved with.

Incident Summary:
"${content}"

Category: ${category.replace("_", " ")}
Severity: ${severity}
Location: ${zone}, ${city}

Actionable Steps:
${actionSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n")}

Stay safe,
Nexwatch Team`;

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <!-- Header Section -->
              <div style="background-color: ${colors.bg}; padding: 32px 24px; border-bottom: 2px solid ${colors.border}; text-align: center;">
                <div style="display: inline-block; background-color: ${colors.text}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                  Safety Alert: ${severity}
                </div>
                <h1 style="color: ${colors.text}; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
                  ${category.replace("_", " ").toUpperCase()} REPORTED
                </h1>
                <p style="color: ${colors.text}; margin: 8px 0 0; font-size: 16px; opacity: 0.9;">
                  In ${zone}, ${city}
                </p>
              </div>

              <!-- Content Section -->
              <div style="padding: 32px 24px;">
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
                  Hello ${recipient.name},<br><br>
                  A verified safety digest has been issued for your area or an incident you're involved with.
                </p>

                <div style="margin-top: 32px; background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
                  <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; font-weight: 700;">
                    Incident Summary
                  </h3>
                  <p style="color: #334155; font-size: 16px; font-style: italic; margin: 0; line-height: 1.5;">
                    "${content}"
                  </p>
                </div>

                <div style="margin-top: 32px;">
                  <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px; font-weight: 700;">
                    Recommended Action Steps
                  </h3>
                  <ul style="padding: 0; margin: 0; list-style-type: none;">
                    ${actionSteps.map(step => `
                      <li style="margin-bottom: 12px; color: #334155; font-size: 15px; display: flex; align-items: flex-start;">
                        <span style="color: ${colors.border}; font-weight: bold; margin-right: 12px;">•</span>
                        <span>${step}</span>
                      </li>
                    `).join("")}
                  </ul>
                </div>

                <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #64748b; font-size: 14px; margin: 0;">
                    Stay safe and keep your neighborhood prepared.
                  </p>
                </div>
              </div>

              <!-- Footer Secion -->
              <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <div style="color: #1e293b; font-weight: 800; font-size: 16px; letter-spacing: -0.01em;">
                  Nexwatch
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0;">
                  Community Verification Platform
                </p>
              </div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
               <p style="color: #94a3b8; font-size: 11px;">
                You received this because you are a registered user in ${zone} or participated in this report's verification.
              </p>
            </div>
          </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@example.com",
        to: recipient.email,
        subject,
        text: body,
        html: htmlBody,
      });
    }
  } else {
    console.log("Digest created", {
      id: digest.id,
      zone: digest.zone,
      severity: digest.severity,
    });
  }
}
