import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../../../lib/auth";
import { approveFeedback } from "../../../../../../lib/repository";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    assertAdmin(request);
    const { leadId } = await context.params;
    return json(await approveFeedback(leadId));
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
