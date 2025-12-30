import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not set");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch current status
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("status, tos_agreed, guide_checked")
      .eq("id", userId)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let nextStatus = userData.status;
    const updates: Record<string, unknown> = {};

    if (action === "agree_tos" && userData.status === "AWAITING_TOS_AGREEMENT") {
      updates.tos_agreed = true;
      nextStatus = "AWAITING_GUIDE_CHECK";
    } else if (action === "check_guide" && userData.status === "AWAITING_GUIDE_CHECK") {
      updates.guide_checked = true;
      nextStatus = "READY_TO_PURCHASE";
    } else {
      return NextResponse.json({ error: "Invalid action for current status" }, { status: 400 });
    }

    updates.status = nextStatus;

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ status: nextStatus });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
