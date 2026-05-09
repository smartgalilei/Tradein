# Tradein

Tradein is a single-merchant MVP for turning used-car sell intent inside ChatGPT into a structured purchase inquiry, with two human approval gates:

1. Admin approval before sending the lead to the merchant.
2. Admin approval before showing merchant feedback to the user.

The first merchant is:

- Name: `天野自動車東京店`
- Email: `smartgalilei@gmail.com`
- Channel: email only

## Routes

- `/`: public product proposal page. Keep this as the stable external-facing link.
- `/admin`: internal admin console for lead review, merchant email approval, reply entry, and user feedback approval.
- `/api/mcp`: ChatGPT App / MCP endpoint.
- `/api/admin/*`: admin-only operational APIs.
- `/api/admin/gmail/sync`: manual Gmail reply sync.

The older static files remain in the repo as references:

- `index.html`: original product proposal page.
- `outreach-console.html`: earlier static Phase 1 console prototype.
- `merchants.json`: single merchant seed list.

## Local Development

Install dependencies:

```bash
npm install
```

Run local server:

```bash
npm run dev
```

Open:

- Product page: [http://localhost:3000](http://localhost:3000)
- Admin console: [http://localhost:3000/admin](http://localhost:3000/admin)
- MCP endpoint: [http://localhost:3000/api/mcp](http://localhost:3000/api/mcp)

Without Supabase env vars, the app runs in memory mode. Without Gmail env vars, merchant email sending runs in safe `dry_run` mode.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

Required for persistent production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended for admin access:

- `ADMIN_PASSWORD`

Required for real Gmail sending/sync:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

Email sending is hard-limited to the merchant whitelist in code: `smartgalilei@gmail.com`.

## Supabase Setup

1. Create a Supabase free project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_initial.sql`.
4. Copy project URL to `NEXT_PUBLIC_SUPABASE_URL`.
5. Copy service role key to `SUPABASE_SERVICE_ROLE_KEY`.

RLS is enabled on all MVP tables. The Vercel server uses the service role key for Phase 1 admin/MCP operations.

## Vercel Setup

1. Connect this GitHub repo to Vercel.
2. Set the environment variables above.
3. Deploy.
4. Confirm:
   - `/` shows the product page.
   - `/admin` loads the admin console.
   - `/api/mcp` returns the MCP endpoint summary.

## Gmail Setup

Use Gmail API OAuth credentials for the sender account.

The Gmail send route:

- requires admin auth,
- only sends after clicking `Approve & Send Email`,
- only sends to `smartgalilei@gmail.com`,
- falls back to dry-run mode if Gmail env vars are missing.

Reply sync is manual in Phase 1 through `/admin` via `Sync Gmail Replies`.

## ChatGPT App / MCP Testing

Use ChatGPT Developer Mode and connect the deployed HTTPS endpoint:

```text
https://your-vercel-domain.vercel.app/api/mcp
```

MCP tools:

- `create_tradein_lead`
- `get_tradein_lead_status`
- `get_tradein_feedback`

Important: MCP tools never send merchant email directly. Email can only be sent from `/admin` after human approval.

Golden test:

1. In ChatGPT, create a lead: `2019年 Toyota Alphard、7万km、東京都で売りたい`
2. Confirm ChatGPT returns a `lead_id` and says admin approval is required.
3. In `/admin`, approve and send merchant email.
4. Register or sync a merchant reply.
5. Approve user feedback in `/admin`.
6. In ChatGPT, call `get_tradein_feedback` for the lead.

## Tests

Static smoke test:

```bash
npm test
```

Type/build checks:

```bash
npm run typecheck
npm run build
```
