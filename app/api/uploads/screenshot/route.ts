import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { fileName, contentType } = body;

  if (!fileName) {
    return NextResponse.json({ error: "ファイル名が必要です" }, { status: 400 });
  }

  const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
  const filename = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const path = `${auth.userId}/${filename}`;

  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUploadUrl(path, 60, {
      contentType: contentType ?? "application/octet-stream",
    });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "署名付きURLの生成に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ path, uploadUrl: data.signedUrl, contentType: contentType ?? "application/octet-stream" });
}
