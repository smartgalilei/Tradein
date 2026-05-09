import { MERCHANT_EMAIL_WHITELIST } from "./constants";

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type GmailSendResult = {
  id: string | null;
  mode: "gmail" | "dry_run";
};

export function hasGmailConfig() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
}

export async function sendMerchantEmail(input: SendEmailInput): Promise<GmailSendResult> {
  if (!MERCHANT_EMAIL_WHITELIST.includes(input.to)) {
    throw new Error(`Email destination is not whitelisted: ${input.to}`);
  }

  if (!hasGmailConfig()) {
    return { id: `dry-run-${Date.now()}`, mode: "dry_run" };
  }

  const accessToken = await getAccessToken();
  const raw = buildRawMessage(input);
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ raw })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail send failed: ${response.status} ${text}`);
  }

  const result = (await response.json()) as { id?: string };
  return { id: result.id || null, mode: "gmail" };
}

export async function searchMerchantReplies() {
  if (!hasGmailConfig()) {
    return [];
  }

  const accessToken = await getAccessToken();
  const query = encodeURIComponent(
    `from:${MERCHANT_EMAIL_WHITELIST[0]} newer_than:30d (Tradein OR 買取査定 OR 査定)`
  );
  const search = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`,
    {
      headers: { authorization: `Bearer ${accessToken}` }
    }
  );

  if (!search.ok) {
    const text = await search.text();
    throw new Error(`Gmail search failed: ${search.status} ${text}`);
  }

  const searchResult = (await search.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };

  const messages = await Promise.all(
    (searchResult.messages || []).map(async (message) => {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
        {
          headers: { authorization: `Bearer ${accessToken}` }
        }
      );
      if (!detail.ok) return null;
      const payload = (await detail.json()) as GmailMessage;
      return decodeGmailMessage(payload);
    })
  );

  return messages.filter(Boolean) as Array<{
    gmail_message_id: string;
    raw_from: string;
    raw_subject: string;
    raw_body: string;
  }>;
}

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID as string,
      client_secret: process.env.GMAIL_CLIENT_SECRET as string,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN as string,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail token refresh failed: ${response.status} ${text}`);
  }

  const token = (await response.json()) as { access_token: string };
  return token.access_token;
}

function buildRawMessage(input: SendEmailInput) {
  const headers = [
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit"
  ];
  const message = `${headers.join("\r\n")}\r\n\r\n${input.body}`;
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

type GmailMessage = {
  id: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  };
};

function decodeGmailMessage(message: GmailMessage) {
  const headers = message.payload?.headers || [];
  const raw_from = headers.find((item) => item.name.toLowerCase() === "from")?.value || "";
  const raw_subject =
    headers.find((item) => item.name.toLowerCase() === "subject")?.value || "";
  const data =
    message.payload?.body?.data ||
    message.payload?.parts?.find((part) => part.mimeType === "text/plain")?.body?.data ||
    "";
  const raw_body = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );

  return {
    gmail_message_id: message.id,
    raw_from,
    raw_subject,
    raw_body
  };
}
