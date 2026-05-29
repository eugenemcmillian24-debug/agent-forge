import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createServerClient();
  const { data } = await supabase.from("model_preferences").select().eq("user_id", user.id);
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin.from("provider_configs").upsert({
    user_id: user.id, ...body, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
