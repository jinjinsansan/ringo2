import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailViaResend } from "./resendClient";

export type NotificationPayload = {
  id?: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  metadata?: Record<string, unknown>;
  email?: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  } | null;
};

export type NotificationDispatchResult = {
  userId: string;
  notificationId: string;
  email?: {
    to: string | string[];
    messageId?: string | null;
  };
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function dispatchNotifications(client: SupabaseClient | null, inputs: NotificationPayload[]) {
  if (!client || inputs.length === 0) return [] as NotificationDispatchResult[];

  const payloads = inputs.map((input) => ({
    ...input,
    id: input.id ?? randomUUID(),
  }));

  const rows = payloads.map((payload) => ({
    id: payload.id,
    user_id: payload.userId,
    title: payload.title,
    body: payload.body,
    category: payload.category,
    metadata: payload.metadata ?? null,
  }));

  for (const portion of chunk(rows, 500)) {
    const { error } = await client.from("notifications").insert(portion);
    if (error) {
      console.error("Failed to insert notifications", error);
      throw new Error(error.message);
    }
  }

  const results: NotificationDispatchResult[] = payloads.map((payload) => ({
    userId: payload.userId,
    notificationId: payload.id,
    email: payload.email
      ? {
          to: payload.email.to,
          messageId: null,
        }
      : undefined,
  }));

  for (let index = 0; index < payloads.length; index += 1) {
    const payload = payloads[index];
    if (!payload.email || !payload.email.to) continue;
    try {
      const response = await sendEmailViaResend({
        to: payload.email.to,
        subject: payload.email.subject,
        html: payload.email.html,
        text: payload.email.text,
      });
      if (results[index]?.email && response && typeof response === "object" && "id" in response) {
        results[index].email!.messageId = (response as { id?: string }).id ?? null;
      }
    } catch (error) {
      console.error("Failed to send email notification", error);
      throw error;
    }
  }

  return results;
}
