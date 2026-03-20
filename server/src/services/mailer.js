import nodemailer from "nodemailer";

export async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const baseSendMail = transporter.sendMail.bind(transporter);
  transporter.sendMail = async (mailOptions) => {
    const info = await baseSendMail(mailOptions);
    return { ...info, previewUrl: nodemailer.getTestMessageUrl(info) };
  };

  return transporter;
}
