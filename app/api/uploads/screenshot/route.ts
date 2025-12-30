import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

export const runtime = "edge";

const bucket = process.env.SUPABASE_SCREENSHOT_BUCKET;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!bucket) {
    return NextResponse.json({ error: "Screenshot bucket is not configured" }, { status: 500 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const filename = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const path = `${auth.userId}/${filename}`;

  const { error } = await adminClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path });
}
