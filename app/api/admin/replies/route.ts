import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../lib/auth";
import { createMerchantReply, getOverview } from "../../../../lib/repository";

export async function POST(request: NextRequest) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const overview = await getOverview();
    const outreach = overview.outreachAttempts.find(
      (item) => item.lead_id === body.lead_id
    );
    return json(
      await createMerchantReply({
        lead_id: body.lead_id,
        outreach_attempt_id: outreach?.id || null,
        raw_body: body.raw_body,
        response_summary: body.response_summary,
        quote_man_yen: body.quote_man_yen ?? null,
        raw_subject: body.raw_subject || ""
      })
    );
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
