import { SINGLE_MERCHANT } from "./constants";
import type { Lead, Merchant, VehicleInfo } from "./types";

export function normalizeVehicle(input: Partial<VehicleInfo>): VehicleInfo {
  return {
    make: String(input.make || "").trim(),
    model: String(input.model || "").trim(),
    year: Number(input.year || new Date().getFullYear()),
    mileage_km: Number(input.mileage_km || 0),
    category: input.category || "中古車",
    condition: input.condition || "通常",
    accident_history: input.accident_history || "未確認",
    inspection_remaining: input.inspection_remaining || "未確認",
    photos: Array.isArray(input.photos) ? input.photos : []
  };
}

export function generateOutreachSubject(lead: Pick<Lead, "vehicle">) {
  return `買取査定のご相談｜${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}`;
}

export function generateOutreachMessage(
  lead: Pick<
    Lead,
    | "id"
    | "customer_name"
    | "customer_contact"
    | "preferred_contact"
    | "vehicle"
    | "location"
    | "desired_price_man_yen"
    | "sell_by"
    | "notes"
  >,
  merchant: Merchant = SINGLE_MERCHANT
) {
  const price = lead.desired_price_man_yen
    ? `${lead.desired_price_man_yen}万円`
    : "未設定";

  return [
    `${merchant.name} ご担当者様`,
    "",
    "Tradein事務局です。",
    "下記車両の買取査定についてご相談です。",
    "",
    "【リードID】" + lead.id,
    "【ユーザー】" +
      (lead.customer_name || "ChatGPTユーザー") +
      " / 希望連絡: " +
      (lead.preferred_contact || "未確認"),
    "【連絡先】" + formatCustomerContact(lead.customer_contact),
    "【車両】" +
      lead.vehicle.year +
      "年 " +
      lead.vehicle.make +
      " " +
      lead.vehicle.model +
      " (" +
      (lead.vehicle.category || "中古車") +
      ")",
    "【状態】走行 " +
      lead.vehicle.mileage_km.toLocaleString("ja-JP") +
      "km / 修復歴 " +
      (lead.vehicle.accident_history || "未確認") +
      " / " +
      (lead.vehicle.condition || "通常"),
    "【車検残】" + (lead.vehicle.inspection_remaining || "未確認"),
    "【地域】" +
      lead.location.prefecture +
      (lead.location.city ? " " + lead.location.city : ""),
    "【売却時期】" + (lead.sell_by || "未定"),
    "【希望価格】" + price,
    lead.notes ? "【補足】" + lead.notes : "",
    "",
    "現時点では概算査定で問題ございません。",
    "概算の買取可能価格、確認が必要な追加情報、対応可能な買取方法（店頭・出張・オンライン）についてご返信いただけますと幸いです。",
    "",
    "よろしくお願いいたします。",
    "",
    "Tradein"
  ]
    .filter(Boolean)
    .join("\n");
}

function formatCustomerContact(contact?: string) {
  const trimmed = contact?.trim();
  return trimmed || "未共有";
}

export function parseQuoteManYen(text: string) {
  const normalized = text.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  const match = normalized.match(/(\d{2,4})\s*万/);
  return match ? Number(match[1]) : null;
}
