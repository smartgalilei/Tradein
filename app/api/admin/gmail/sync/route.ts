import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../../lib/auth";
import { searchMerchantReplies } from "../../../../../lib/gmail";
import { parseQuoteManYen } from "../../../../../lib/outreach";
import { createMerchantReply, getOverview } from "../../../../../lib/repository";

export async function POST(request: NextRequest) {
  try {
    assertAdmin(request);
    const overview = await getOverview();
    const latestSent = overview.outreachAttempts.find((item) => item.status === "sent");
    if (!latestSent) return json({ imported: 0, reason: "No sent outreach" });

    const messages = await searchMerchantReplies();
    let imported = 0;
    for (const message of messages) {
      const alreadyImported = overview.replies.some(
        (reply) => reply.gmail_message_id === message.gmail_message_id
      );
      if (alreadyImported) continue;
      await createMerchantReply({
        lead_id: latestSent.lead_id,
        outreach_attempt_id: latestSent.id,
        raw_body: message.raw_body,
        response_summary: message.raw_body.slice(0, 240),
        quote_man_yen: parseQuoteManYen(message.raw_body),
        gmail_message_id: message.gmail_message_id,
        raw_from: message.raw_from,
        raw_subject: message.raw_subject
      });
      imported += 1;
    }
    return json({ imported });
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
