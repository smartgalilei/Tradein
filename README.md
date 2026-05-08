# Tradein

This repository contains two separate pages:

- `index.html`: public product proposal page. Keep this as the stable external-facing link.
- `outreach-console.html`: internal Phase 1 MVP console for lightweight merchant outreach testing.
- `merchants.json`: first real merchant seed list for public outreach contact data.

Do not replace the product proposal page with the MVP console. They are intentionally separate links.

## Phase 1 MVP Console

Dependency-free local prototype for lightweight merchant outreach on used-car trade-in leads.

## What This MVP Includes

- Lead intake form for used-car sell intent
- Structured lead record view
- Mock matching against a seeded **public contact database**
- Auto-generated Japanese outreach drafts for:
  - `email`
  - `sms`
  - `contact_form`
  - `line`
  - `manual`
- Manual outreach queue with:
  - message copy
  - open-link
  - mark sent
  - mark responded
  - quote entry
  - response memo
- Feedback summary (reply rate / quote stats)
- Browser persistence via `localStorage`

## Local Run

Option A (quick): open `outreach-console.html` directly in a browser.

Option B (recommended): run a local static server from repo root.

```bash
python3 -m http.server 8080
```

Then open:

- Product proposal page: [http://localhost:8080/index.html](http://localhost:8080/index.html)
- MVP outreach console: [http://localhost:8080/outreach-console.html](http://localhost:8080/outreach-console.html)

## Local Test Checklist

1. Register a lead from the intake form.
2. Confirm matched merchants and generated channel drafts appear.
3. Confirm queue rows are auto-created.
4. Use `コピー` and `リンク` actions in queue rows.
5. Mark rows as `送信済` / `返信あり`, then enter quotes/memos.
6. Reload page and confirm state is retained.
7. Confirm summary metrics and feedback list update.

## Scope Note (Phase 1)

Real email/SMS/contact-form/LINE delivery is **not integrated** in this phase.
Sending is mocked/manual-only through copied text and open links.

## ChatGPT App Test Path

This prototype is intentionally static so the business loop can be tested first. To test it as a real ChatGPT App later, wrap the same lead/outreach logic behind an Apps SDK MCP server.

Minimum MCP tools for the first ChatGPT App test:

- `create_lead`: accept the user's used-car sell intent and return a structured lead.
- `match_merchants`: return matched public-contact merchants for a lead.
- `generate_outreach`: generate channel-specific Japanese outreach drafts.
- `record_outreach_status`: mark draft/sent/responded/no_response/do_not_contact.
- `record_quote`: save merchant response summary and quote.

Local ChatGPT App testing flow:

1. Build an MCP server with a public `/mcp` endpoint.
2. Run it locally, then expose it with a tunnel such as `ngrok http <port>`.
3. Enable ChatGPT Developer Mode.
4. In ChatGPT, create a connector using the public `https://.../mcp` URL.
5. Test golden prompts such as:
   - `2019年のToyota Alphard、7万km、東京都で売りたい。買取候補を探して。`
   - `このリード用に買取店向けメール文面を作って。`
   - `東京クイック買取から260万円の概算返信が来たので記録して。`
6. Verify tool calls, arguments, returned structured data, and user-facing summaries.

Official OpenAI Apps SDK references:

- Quickstart: https://developers.openai.com/apps-sdk/quickstart
- Deploy locally with a tunnel: https://developers.openai.com/apps-sdk/deploy
- Connect from ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- Test integration: https://developers.openai.com/apps-sdk/deploy/testing
