import nodemailer from "nodemailer";
import { ENV } from "./env";

type EmailFailureReason = "missing_config" | "transport_error";

function hasEmailConfig() {
  return Boolean(
    ENV.smtpHost &&
      ENV.smtpPort &&
      ENV.smtpUser &&
      ENV.smtpPass &&
      ENV.emailFrom
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
}

export async function sendEmailCampaign(payload: {
  title: string;
  message: string;
  recipients: string[];
}) {
  const emails = Array.from(
    new Set(
      payload.recipients
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
    )
  );

  if (emails.length === 0) {
    return {
      ok: true as const,
      sent: 0,
      failed: 0,
      reason: null as EmailFailureReason | null,
    };
  }

  if (!hasEmailConfig()) {
    return {
      ok: false as const,
      sent: 0,
      failed: emails.length,
      reason: "missing_config" as const,
    };
  }

  try {
    const transporter = createTransporter();
    await Promise.all(
      emails.map((to) =>
        transporter.sendMail({
          from: ENV.emailFrom,
          to,
          subject: payload.title,
          text: payload.message,
        })
      )
    );

    return {
      ok: true as const,
      sent: emails.length,
      failed: 0,
      reason: null as EmailFailureReason | null,
    };
  } catch (error) {
    console.warn("[Email] Failed to send campaign emails", error);
    return {
      ok: false as const,
      sent: 0,
      failed: emails.length,
      reason: "transport_error" as const,
    };
  }
}
