import { NextRequest } from "next/server";

export function assertAdmin(request: NextRequest) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return;
  }

  const provided = request.headers.get("x-admin-password");
  if (provided !== configuredPassword) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized admin request" }),
      {
        status: 401,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function isResponseError(error: unknown): error is Response {
  return error instanceof Response;
}
