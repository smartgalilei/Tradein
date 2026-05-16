import { NextRequest } from "next/server";
import { SINGLE_MERCHANT } from "../../../../lib/constants";
import { getSupabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({
      ok: true,
      mode: "memory",
      message: "Supabase is not configured; keepalive skipped."
    });
  }

  const merchant = await supabase
    .from("merchants")
    .select("id,status")
    .eq("id", SINGLE_MERCHANT.id)
    .maybeSingle();
  if (merchant.error) {
    return Response.json({ error: merchant.error.message }, { status: 500 });
  }

  const audit = await supabase.from("audit_events").insert({
    event_type: "cron_keepalive",
    lead_id: null,
    payload: {
      source: "vercel_cron",
      merchant_id: SINGLE_MERCHANT.id,
      merchant_status: merchant.data?.status || null
    }
  });
  if (audit.error) {
    return Response.json({ error: audit.error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    mode: "supabase",
    merchant_id: merchant.data?.id || SINGLE_MERCHANT.id,
    checked_at: new Date().toISOString()
  });
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminHeader = request.headers.get("x-admin-password");
  if (adminPassword && adminHeader === adminPassword) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}
