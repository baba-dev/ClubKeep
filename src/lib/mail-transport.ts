import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import type { AuthFeatureConfig } from "@/lib/auth-config";

type MailSender = { sendMail(message: SendMailOptions): Promise<unknown> };

export function mailInABoxTransportOptions(config: AuthFeatureConfig) {
  if (!config.features.emailLink || !config.smtp) {
    throw new Error("Email authentication is not configured");
  }
  return {
    host: "mx.bababuilds.com",
    port: 587,
    secure: false,
    requireTLS: true,
    ignoreTLS: false,
    tls: { servername: "mx.bababuilds.com", rejectUnauthorized: true },
    auth: { user: config.smtp.user, pass: config.smtp.password },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  } as const;
}

/**
 * Email scanners that fetch HTTPS URLs cannot consume this link: the sensitive
 * bearer token lives in a URL fragment (not sent in the HTTP GET). Only the
 * user's explicit Continue action will exchange it via Better Auth.
 */
export function confirmationLink(origin: string, token: string): string {
  if (!/^[A-Za-z0-9._~-]{16,1024}$/.test(token)) {
    throw new Error("Invalid magic link token");
  }
  const url = new URL("/auth/confirm", origin);
  url.hash = "token=" + encodeURIComponent(token);
  return url.toString();
}

export async function sendMagicLinkEmail(
  recipient: string,
  token: string,
  config: AuthFeatureConfig,
  sender?: MailSender
): Promise<void> {
  if (!config.smtp || !config.features.emailLink) {
    throw new Error("Email authentication is not configured");
  }
  const options = mailInABoxTransportOptions(config);
  const transporter: MailSender = sender ?? nodemailer.createTransport(options);
  const link = confirmationLink(config.origin, token);
  // Only static templates; email addresses and secrets are never logged.
  const mail: SendMailOptions = {
    from: config.smtp.from,
    to: recipient,
    subject: "Your ClubKeep sign-in link",
    text:
      "Use this private ClubKeep sign-in link within 5 minutes:\n\n" +
      link +
      "\n\nIf you did not request a sign-in link, ignore this message.",
    html:
      '<div style="font:16px/1.6 system-ui,sans-serif;max-width:520px;margin:auto">' +
      "<h2>Sign in to ClubKeep</h2>" +
      "<p>This private link expires in 5 minutes and works only once.</p>" +
      '<p><a href="' +
      link +
      '">Continue to ClubKeep</a></p>' +
      "<p>If you did not request this link, you can ignore this message.</p>" +
      "</div>",
  };
  try {
    await transporter.sendMail(mail);
  } catch {
    // Do not expose SMTP credentials, recipients, raw server replies or tokens.
    throw new Error("AUTH_EMAIL_DELIVERY_UNAVAILABLE");
  }
}
