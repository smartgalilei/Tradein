import { NextRequest } from "next/server";
import {
  createLead,
  getApprovedFeedback,
  getLeadStatus,
  queueContactShare
} from "../../../lib/repository";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
};

const tools = [
  {
    name: "create_tradein_lead",
    description:
      "Create an initial used-car trade-in lead from vehicle and sale details only. Do not ask for or share the user's phone/email at this stage. This queues a merchant quote request for admin approval but never sends email directly.",
    inputSchema: {
      type: "object",
      properties: {
        app_user_key: { type: "string" },
        customer_name: { type: "string" },
        vehicle: {
          type: "object",
          properties: {
            make: { type: "string" },
            model: { type: "string" },
            year: { type: "number" },
            mileage_km: { type: "number" },
            category: { type: "string" },
            condition: { type: "string" },
            accident_history: { type: "string" },
            inspection_remaining: { type: "string" }
          },
          required: ["make", "model", "year", "mileage_km"]
        },
        location: {
          type: "object",
          properties: {
            prefecture: { type: "string" },
            city: { type: "string" }
          },
          required: ["prefecture"]
        },
        desired_price_man_yen: { type: "number" },
        sell_by: { type: "string" },
        notes: { type: "string" }
      },
      required: ["vehicle", "location"]
    }
  },
  {
    name: "share_tradein_contact",
    description:
      "After approved merchant feedback has been shown and the user explicitly agrees to proceed, queue the user's contact details to be shared with the merchant. This requires admin approval and never sends email directly.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        app_user_key: { type: "string" },
        customer_contact: {
          type: "string",
          description:
            "User-approved contact details to share with the merchant, such as phone number and/or email."
        },
        customer_email: {
          type: "string",
          description: "User-approved email address to share with the merchant."
        },
        customer_phone: {
          type: "string",
          description: "User-approved phone number to share with the merchant."
        },
        preferred_contact: {
          type: "string",
          description: "Preferred contact method, for example email or phone."
        },
        notes: {
          type: "string",
          description: "Optional context about the user's consent or preferred next step."
        }
      },
      required: ["lead_id"]
    }
  },
  {
    name: "get_tradein_lead_status",
    description: "Get the current processing status for a Tradein lead.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        app_user_key: { type: "string" }
      },
      required: ["lead_id"]
    }
  },
  {
    name: "get_tradein_feedback",
    description:
      "Return merchant feedback only after an admin has approved it for the user.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        app_user_key: { type: "string" }
      },
      required: ["lead_id"]
    }
  }
];

export async function GET() {
  return Response.json({
    name: "Tradein MCP",
    description: "MCP endpoint for the Tradein single-merchant MVP",
    tools: tools.map((tool) => tool.name)
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
  if (Array.isArray(body)) {
    return Response.json(await Promise.all(body.map(handleJsonRpc)));
  }
  return Response.json(await handleJsonRpc(body));
}

async function handleJsonRpc(request: JsonRpcRequest) {
  try {
    if (request.method === "initialize") {
      return result(request.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "tradein", version: "0.2.0" }
      });
    }

    if (request.method === "tools/list") {
      return result(request.id, { tools });
    }

    if (request.method === "tools/call") {
      const name = request.params?.name;
      const args = request.params?.arguments || {};
      if (name === "create_tradein_lead") {
        const created = await createLead({
          app_user_key: String(args.app_user_key || "chatgpt-anonymous"),
          customer_name: optionalString(args.customer_name),
          customer_contact: undefined,
          preferred_contact: "ChatGPT",
          vehicle: (args.vehicle || {}) as Record<string, unknown>,
          location: (args.location || {}) as { prefecture: string; city?: string },
          desired_price_man_yen: optionalNumber(args.desired_price_man_yen),
          sell_by: optionalString(args.sell_by),
          notes: optionalString(args.notes)
        });
        return result(request.id, {
          content: [
            {
              type: "text",
              text:
                "査定候補へ確認準備を開始しました。管理者が内容を確認してから天野自動車東京店へメール送信します。"
            }
          ],
          structuredContent: {
            lead_id: created.lead.id,
            status: created.lead.status,
            merchant_email_requires_admin_approval: true,
            user_feedback_requires_admin_approval: true
          }
        });
      }

      if (name === "share_tradein_contact") {
        const queued = await queueContactShare({
          lead_id: String(args.lead_id || ""),
          app_user_key: optionalString(args.app_user_key),
          customer_contact: buildCustomerContact(args) || "",
          preferred_contact: optionalString(args.preferred_contact),
          notes: optionalString(args.notes)
        });
        return result(request.id, {
          content: [
            {
              type: "text",
              text:
                "連絡先共有の準備を開始しました。管理者が内容を確認してから天野自動車東京店へメール送信します。"
            }
          ],
          structuredContent: {
            lead_id: queued.lead.id,
            outreach_id: queued.outreach.id,
            outreach_status: queued.outreach.status,
            merchant_email_requires_admin_approval: true
          }
        });
      }

      if (name === "get_tradein_lead_status") {
        const status = await getLeadStatus(
          String(args.lead_id),
          optionalString(args.app_user_key)
        );
        if (!status) return toolText(request.id, "指定された lead が見つかりません。");
        return result(request.id, {
          content: [{ type: "text", text: statusText(status.lead.status) }],
          structuredContent: {
            lead_id: status.lead.id,
            lead_status: status.lead.status,
            outreach_status: status.outreach?.status || null,
            has_merchant_reply: Boolean(status.reply),
            feedback_status: status.feedback?.status || null
          }
        });
      }

      if (name === "get_tradein_feedback") {
        const feedback = await getApprovedFeedback(
          String(args.lead_id),
          optionalString(args.app_user_key)
        );
        if (!feedback) {
          return toolText(
            request.id,
            "まだユーザー向けに承認された査定フィードバックはありません。"
          );
        }
        return result(request.id, {
          content: [{ type: "text", text: feedback.feedback_text }],
          structuredContent: feedback
        });
      }

      return error(request.id, -32601, `Unknown tool: ${name}`);
    }

    return error(request.id, -32601, `Unknown method: ${request.method}`);
  } catch (caught) {
    return error(request.id, -32000, String(caught));
  }
}

function result(id: JsonRpcRequest["id"], value: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result: value };
}

function error(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function toolText(id: JsonRpcRequest["id"], text: string) {
  return result(id, { content: [{ type: "text", text }], structuredContent: {} });
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildCustomerContact(args: Record<string, unknown>) {
  const contact = optionalString(args.customer_contact);
  const email = optionalString(args.customer_email);
  const phone = optionalString(args.customer_phone);
  const parts = [contact, email, phone].filter(Boolean) as string[];
  if (!parts.length) return undefined;
  return Array.from(new Set(parts)).join(" / ");
}

function statusText(status: string) {
  if (status === "pending_merchant_approval") {
    return "リードを受け付けました。管理者が確認後、天野自動車東京店へ査定依頼メールを送信します。";
  }
  if (status === "sent_to_merchant") {
    return "天野自動車東京店へ査定依頼を送信済みです。返信を待っています。";
  }
  if (status === "merchant_responded") {
    return "商戶から返信がありました。管理者がユーザー向け反馈を確認中です。";
  }
  if (status === "feedback_approved") {
    return "査定フィードバックの準備ができています。";
  }
  return "リードを処理中です。";
}
