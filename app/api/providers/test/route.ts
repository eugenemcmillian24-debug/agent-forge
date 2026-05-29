import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { healthCheckAll } from "@/lib/ai/provider-router";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await healthCheckAll();
  return NextResponse.json(results);
}
