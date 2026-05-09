import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../lib/auth";
import { getOverview } from "../../../../lib/repository";

export async function GET(request: NextRequest) {
  try {
    assertAdmin(request);
    return json(await getOverview());
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
