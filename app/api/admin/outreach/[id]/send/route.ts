import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../../../lib/auth";
import { sendMerchantEmail } from "../../../../../../lib/gmail";
import { getOverview, markOutreachSent } from "../../../../../../lib/repository";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertAdmin(request);
    const { id } = await context.params;
    const overview = await getOverview();
    const outreach = overview.outreachAttempts.find((item) => item.id === id);
    if (!outreach) return json({ error: "Outreach not found" }, { status: 404 });
    if (outreach.status !== "pending_approval") {
      return json({ error: "Outreach is not pending approval" }, { status: 409 });
    }

    const sent = await sendMerchantEmail({
      to: outreach.destination,
      subject: outreach.generated_subject,
      body: outreach.generated_message
    });
    await markOutreachSent(outreach.id, sent.id);
    return json({ ok: true, mode: sent.mode, messageId: sent.id });
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
