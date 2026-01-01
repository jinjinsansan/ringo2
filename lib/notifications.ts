import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailViaResend } from "./resendClient";

export type NotificationPayload = {
  userId: string;
  title: string;
  body: string;
  category: string;
  metadata?: Record<string, unknown>;
  email?: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  } | null;
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function persistNotifications(client: SupabaseClient | null, inputs: NotificationPayload[]) {
  if (!client || inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    category: input.category,
    metadata: input.metadata ?? null,
  }));

  for (const portion of chunk(rows, 500)) {
    const { error } = await client.from("notifications").insert(portion);
    if (error) {
      console.error("Failed to insert notifications", error);
      throw new Error(error.message);
    }
  }
}

export async function dispatchNotifications(client: SupabaseClient | null, inputs: NotificationPayload[]) {
  await persistNotifications(client, inputs);

  for (const input of inputs) {
    if (!input.email || !input.email.to) continue;
    try {
      await sendEmailViaResend({
        to: input.email.to,
        subject: input.email.subject,
        html: input.email.html,
        text: input.email.text,
      });
    } catch (error) {
      console.error("Failed to send email notification", error);
      throw error;
    }
  }
}
