import { readFileSync } from "node:fs";

const files = [
  "app/page.tsx",
  "app/admin/AdminConsole.tsx",
  "app/api/mcp/route.ts",
  "app/api/cron/keepalive/route.ts",
  "app/api/admin/outreach/[id]/send/route.ts",
  "lib/gmail.ts",
  "lib/repository.ts",
  "supabase/migrations/001_initial.sql",
  "merchants.json"
];

for (const file of files) {
  readFileSync(file, "utf8");
}

const merchants = JSON.parse(readFileSync("merchants.json", "utf8"));
const merchant = merchants.find((item) => item.id === "m-test-amano-tokyo");
assert(merchant, "single merchant seed exists");
assert(merchant.public_email === "smartgalilei@gmail.com", "merchant email is whitelisted test address");

const mcp = readFileSync("app/api/mcp/route.ts", "utf8");
assert(mcp.includes("create_tradein_lead"), "MCP create tool exists");
assert(mcp.includes("share_tradein_contact"), "MCP contact-share tool exists");
assert(mcp.includes("get_tradein_lead_status"), "MCP status tool exists");
assert(mcp.includes("get_tradein_feedback"), "MCP feedback tool exists");
assert(!mcp.includes("sendMerchantEmail"), "MCP route does not send merchant email");
assert(
  mcp.includes("Do not ask for or share the user's phone/email at this stage"),
  "initial lead tool does not request contact details"
);

const adminSend = readFileSync("app/api/admin/outreach/[id]/send/route.ts", "utf8");
assert(adminSend.includes("assertAdmin"), "admin send route requires admin auth");
assert(adminSend.includes("sendMerchantEmail"), "admin send route uses Gmail send service");

const keepalive = readFileSync("app/api/cron/keepalive/route.ts", "utf8");
assert(keepalive.includes("CRON_SECRET"), "cron keepalive checks CRON_SECRET");
assert(keepalive.includes("cron_keepalive"), "cron keepalive writes an audit marker");

const gmail = readFileSync("lib/gmail.ts", "utf8");
assert(gmail.includes("MERCHANT_EMAIL_WHITELIST"), "Gmail send enforces whitelist");
assert(gmail.includes("dry_run"), "Gmail send has dry-run fallback");

const schema = readFileSync("supabase/migrations/001_initial.sql", "utf8");
for (const table of [
  "leads",
  "merchants",
  "outreach_attempts",
  "merchant_replies",
  "user_feedbacks",
  "audit_events"
]) {
  assert(schema.includes(`create table if not exists ${table}`), `${table} table exists`);
  assert(schema.includes(`alter table ${table} enable row level security`), `${table} RLS enabled`);
}

console.log("Tradein production MVP smoke test passed.");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Smoke test failed: ${message}`);
  }
}
