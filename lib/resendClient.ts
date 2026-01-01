import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  console.warn("[Resend] RESEND_API_KEY is not set. Email sending will be disabled.");
}

if (!resendFromEmail) {
  console.warn("[Resend] RESEND_FROM_EMAIL is not set. Email sending will be disabled.");
}

export const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmailViaResend(params: SendEmailParams) {
  if (!resendClient || !resendFromEmail) {
    throw new Error("Resend client is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  return resendClient.emails.send({
    from: resendFromEmail,
    ...params,
  });
}
