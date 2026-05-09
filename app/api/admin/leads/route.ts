import { NextRequest } from "next/server";
import { assertAdmin, isResponseError, json } from "../../../../lib/auth";
import { createLead } from "../../../../lib/repository";

export async function POST(request: NextRequest) {
  try {
    assertAdmin(request);
    const body = await request.json();
    return json(await createLead({ ...body, app_user_key: body.app_user_key || "admin" }));
  } catch (error) {
    if (isResponseError(error)) return error;
    return json({ error: String(error) }, { status: 500 });
  }
}
