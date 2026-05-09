import { randomUUID } from "crypto";
import { SINGLE_MERCHANT } from "./constants";
import {
  generateContactShareMessage,
  generateContactShareSubject,
  generateOutreachMessage,
  generateOutreachSubject,
  normalizeVehicle
} from "./outreach";
import { getSupabase, hasSupabaseConfig } from "./supabase";
import type {
  AdminOverview,
  FeedbackStatus,
  Lead,
  LeadStatus,
  MerchantReply,
  OutreachAttempt,
  UserFeedback,
  VehicleInfo
} from "./types";

type CreateLeadInput = {
  app_user_key?: string;
  customer_name?: string;
  customer_contact?: string;
  preferred_contact?: string;
  vehicle: Partial<VehicleInfo>;
  location: {
    prefecture: string;
    city?: string;
  };
  desired_price_man_yen?: number | null;
  sell_by?: string;
  notes?: string;
};

type ShareContactInput = {
  lead_id: string;
  app_user_key?: string;
  customer_contact: string;
  preferred_contact?: string;
  notes?: string;
};

type MemoryStore = {
  leads: Lead[];
  outreachAttempts: OutreachAttempt[];
  replies: MerchantReply[];
  feedbacks: UserFeedback[];
  auditEvents: unknown[];
};

const memoryStore: MemoryStore = {
  leads: [],
  outreachAttempts: [],
  replies: [],
  feedbacks: [],
  auditEvents: []
};

export function getMode(): "supabase" | "memory" {
  return hasSupabaseConfig() ? "supabase" : "memory";
}

export async function createLead(input: CreateLeadInput) {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: randomUUID(),
    app_user_key: input.app_user_key || "chatgpt-anonymous",
    customer_name: input.customer_name || "ChatGPTユーザー",
    customer_contact: input.customer_contact || "",
    preferred_contact: input.preferred_contact || "ChatGPT",
    vehicle: normalizeVehicle(input.vehicle),
    location: {
      prefecture: input.location.prefecture,
      city: input.location.city || ""
    },
    desired_price_man_yen: input.desired_price_man_yen ?? null,
    sell_by: input.sell_by || "未定",
    notes: input.notes || "",
    status: "pending_merchant_approval",
    created_at: now,
    updated_at: now
  };

  const subject = generateOutreachSubject(lead);
  const message = generateOutreachMessage(lead, SINGLE_MERCHANT);
  const outreach: OutreachAttempt = {
    id: randomUUID(),
    lead_id: lead.id,
    merchant_id: SINGLE_MERCHANT.id,
    channel: "email",
    destination: SINGLE_MERCHANT.public_email,
    generated_subject: subject,
    generated_message: message,
    status: "pending_approval",
    gmail_message_id: null,
    sent_at: null,
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabase();
  if (supabase) {
    const { error: leadError } = await supabase.from("leads").insert({
      id: lead.id,
      app_user_key: lead.app_user_key,
      customer_name: lead.customer_name,
      customer_contact: lead.customer_contact,
      preferred_contact: lead.preferred_contact,
      vehicle: lead.vehicle,
      location: lead.location,
      desired_price_man_yen: lead.desired_price_man_yen,
      sell_by: lead.sell_by,
      notes: lead.notes,
      status: lead.status
    });
    if (leadError) throw leadError;

    const { error: outreachError } = await supabase
      .from("outreach_attempts")
      .insert({
        id: outreach.id,
        lead_id: outreach.lead_id,
        merchant_id: outreach.merchant_id,
        channel: outreach.channel,
        destination: outreach.destination,
        generated_subject: outreach.generated_subject,
        generated_message: outreach.generated_message,
        status: outreach.status
      });
    if (outreachError) throw outreachError;

    await audit("lead_created", lead.id, { outreach_id: outreach.id });
  } else {
    memoryStore.leads.unshift(lead);
    memoryStore.outreachAttempts.unshift(outreach);
    memoryStore.auditEvents.unshift({ type: "lead_created", leadId: lead.id, at: now });
  }

  return { lead, outreach };
}

export async function queueContactShare(input: ShareContactInput) {
  const now = new Date().toISOString();
  const overview = await getOverview();
  const existing = overview.leads.find(
    (candidate) =>
      candidate.id === input.lead_id &&
      (!input.app_user_key ||
        candidate.app_user_key === input.app_user_key ||
        input.app_user_key === "admin" ||
        input.app_user_key === "chatgpt-anonymous")
  );
  if (!existing) throw new Error("Lead not found");
  if (!input.customer_contact.trim()) throw new Error("Customer contact is required");

  const lead: Lead = {
    ...existing,
    customer_contact: input.customer_contact.trim(),
    preferred_contact: input.preferred_contact || existing.preferred_contact || "未確認",
    notes: [existing.notes, input.notes].filter(Boolean).join("\n"),
    updated_at: now
  };
  const outreach: OutreachAttempt = {
    id: randomUUID(),
    lead_id: lead.id,
    merchant_id: SINGLE_MERCHANT.id,
    channel: "email",
    destination: SINGLE_MERCHANT.public_email,
    generated_subject: generateContactShareSubject(lead),
    generated_message: generateContactShareMessage(lead, SINGLE_MERCHANT),
    status: "pending_approval",
    gmail_message_id: null,
    sent_at: null,
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabase();
  if (supabase) {
    const { error: leadError } = await supabase
      .from("leads")
      .update({
        customer_contact: lead.customer_contact,
        preferred_contact: lead.preferred_contact,
        notes: lead.notes,
        updated_at: now
      })
      .eq("id", lead.id);
    if (leadError) throw leadError;

    const { error: outreachError } = await supabase
      .from("outreach_attempts")
      .insert({
        id: outreach.id,
        lead_id: outreach.lead_id,
        merchant_id: outreach.merchant_id,
        channel: outreach.channel,
        destination: outreach.destination,
        generated_subject: outreach.generated_subject,
        generated_message: outreach.generated_message,
        status: outreach.status
      });
    if (outreachError) throw outreachError;

    await audit("contact_share_queued", lead.id, { outreach_id: outreach.id });
  } else {
    const memoryLead = memoryStore.leads.find((item) => item.id === lead.id);
    if (memoryLead) {
      memoryLead.customer_contact = lead.customer_contact;
      memoryLead.preferred_contact = lead.preferred_contact;
      memoryLead.notes = lead.notes;
      memoryLead.updated_at = now;
    }
    memoryStore.outreachAttempts.unshift(outreach);
    memoryStore.auditEvents.unshift({
      type: "contact_share_queued",
      leadId: lead.id,
      outreachId: outreach.id,
      at: now
    });
  }

  return { lead, outreach };
}

export async function getOverview(): Promise<AdminOverview> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      leads: memoryStore.leads,
      merchant: SINGLE_MERCHANT,
      outreachAttempts: memoryStore.outreachAttempts,
      replies: memoryStore.replies,
      feedbacks: memoryStore.feedbacks,
      mode: "memory",
      gmailConfigured: hasGmailConfig()
    };
  }

  const [leads, outreachAttempts, replies, feedbacks] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase
      .from("outreach_attempts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("merchant_replies")
      .select("*")
      .order("received_at", { ascending: false }),
    supabase.from("user_feedbacks").select("*").order("created_at", { ascending: false })
  ]);

  for (const result of [leads, outreachAttempts, replies, feedbacks]) {
    if (result.error) throw result.error;
  }

  return {
    leads: (leads.data || []) as Lead[],
    merchant: SINGLE_MERCHANT,
    outreachAttempts: (outreachAttempts.data || []) as OutreachAttempt[],
    replies: (replies.data || []) as MerchantReply[],
    feedbacks: (feedbacks.data || []) as UserFeedback[],
    mode: "supabase",
    gmailConfigured: hasGmailConfig()
  };
}

export async function getLeadStatus(leadId: string, appUserKey?: string) {
  const overview = await getOverview();
  const lead = overview.leads.find(
    (candidate) =>
      candidate.id === leadId &&
      (!appUserKey || candidate.app_user_key === appUserKey || appUserKey === "admin")
  );
  if (!lead) return null;
  const outreach = overview.outreachAttempts.find((item) => item.lead_id === lead.id);
  const feedback = overview.feedbacks.find((item) => item.lead_id === lead.id);
  const reply = overview.replies.find((item) => item.lead_id === lead.id);
  return { lead, outreach, reply, feedback };
}

export async function getApprovedFeedback(leadId: string, appUserKey?: string) {
  const status = await getLeadStatus(leadId, appUserKey);
  if (!status?.feedback || status.feedback.status !== "approved") {
    return null;
  }
  return status.feedback;
}

export async function markOutreachSent(
  outreachId: string,
  gmailMessageId: string | null
) {
  const sentAt = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("outreach_attempts")
      .update({
        status: "sent",
        gmail_message_id: gmailMessageId,
        sent_at: sentAt
      })
      .eq("id", outreachId)
      .select()
      .single();
    if (error) throw error;
    await supabase
      .from("leads")
      .update({ status: "sent_to_merchant" satisfies LeadStatus })
      .eq("id", data.lead_id);
    await audit("outreach_sent", data.lead_id, { outreach_id: outreachId });
    return data as OutreachAttempt;
  }

  const outreach = memoryStore.outreachAttempts.find((item) => item.id === outreachId);
  if (!outreach) throw new Error("Outreach attempt not found");
  outreach.status = "sent";
  outreach.gmail_message_id = gmailMessageId;
  outreach.sent_at = sentAt;
  const lead = memoryStore.leads.find((item) => item.id === outreach.lead_id);
  if (lead) lead.status = "sent_to_merchant";
  return outreach;
}

export async function createMerchantReply(input: {
  lead_id: string;
  outreach_attempt_id?: string | null;
  raw_body: string;
  response_summary: string;
  quote_man_yen?: number | null;
  gmail_message_id?: string | null;
  raw_from?: string | null;
  raw_subject?: string | null;
}) {
  const now = new Date().toISOString();
  const reply: MerchantReply = {
    id: randomUUID(),
    lead_id: input.lead_id,
    outreach_attempt_id: input.outreach_attempt_id || null,
    merchant_id: SINGLE_MERCHANT.id,
    gmail_message_id: input.gmail_message_id || null,
    raw_from: input.raw_from || SINGLE_MERCHANT.public_email,
    raw_subject: input.raw_subject || "",
    raw_body: input.raw_body,
    response_summary: input.response_summary,
    quote_man_yen: input.quote_man_yen ?? null,
    received_at: now,
    created_at: now
  };

  const feedbackText = buildFeedbackText(reply);

  const supabase = getSupabase();
  if (supabase) {
    const { error: replyError } = await supabase.from("merchant_replies").insert(reply);
    if (replyError) throw replyError;
    await supabase
      .from("outreach_attempts")
      .update({ status: "responded" satisfies OutreachAttempt["status"] })
      .eq("lead_id", reply.lead_id);
    await supabase
      .from("leads")
      .update({ status: "merchant_responded" satisfies LeadStatus })
      .eq("id", reply.lead_id);
    await upsertDraftFeedback(reply.lead_id, feedbackText);
    await audit("merchant_reply_created", reply.lead_id, { reply_id: reply.id });
  } else {
    memoryStore.replies.unshift(reply);
    const outreach = memoryStore.outreachAttempts.find(
      (item) => item.lead_id === reply.lead_id
    );
    if (outreach) outreach.status = "responded";
    const lead = memoryStore.leads.find((item) => item.id === reply.lead_id);
    if (lead) lead.status = "merchant_responded";
    await upsertDraftFeedback(reply.lead_id, feedbackText);
  }

  return reply;
}

export async function upsertDraftFeedback(leadId: string, feedbackText: string) {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const existing = await supabase
      .from("user_feedbacks")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const { error } = await supabase
        .from("user_feedbacks")
        .update({ feedback_text: feedbackText, status: "draft" satisfies FeedbackStatus })
        .eq("id", existing.data.id);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from("user_feedbacks").insert({
      lead_id: leadId,
      status: "draft",
      feedback_text: feedbackText
    });
    if (error) throw error;
    return;
  }

  const existing = memoryStore.feedbacks.find((item) => item.lead_id === leadId);
  if (existing) {
    existing.feedback_text = feedbackText;
    existing.status = "draft";
    existing.updated_at = now;
    return;
  }
  memoryStore.feedbacks.unshift({
    id: randomUUID(),
    lead_id: leadId,
    status: "draft",
    feedback_text: feedbackText,
    approved_at: null,
    created_at: now,
    updated_at: now
  });
}

export async function approveFeedback(leadId: string) {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("user_feedbacks")
      .update({ status: "approved", approved_at: now })
      .eq("lead_id", leadId)
      .select()
      .single();
    if (error) throw error;
    await supabase
      .from("leads")
      .update({ status: "feedback_approved" satisfies LeadStatus })
      .eq("id", leadId);
    await audit("feedback_approved", leadId, { feedback_id: data.id });
    return data as UserFeedback;
  }

  const feedback = memoryStore.feedbacks.find((item) => item.lead_id === leadId);
  if (!feedback) throw new Error("Feedback draft not found");
  feedback.status = "approved";
  feedback.approved_at = now;
  const lead = memoryStore.leads.find((item) => item.id === leadId);
  if (lead) lead.status = "feedback_approved";
  return feedback;
}

function buildFeedbackText(reply: MerchantReply) {
  return [
    "天野自動車東京店から概算査定の返信がありました。",
    reply.quote_man_yen ? `概算価格: ${reply.quote_man_yen}万円` : "概算価格: 返信内容をご確認ください。",
    `返信要約: ${reply.response_summary}`,
    "次のステップに進む場合は、追加写真や現車確認の日程調整が必要です。"
  ].join("\n");
}

async function audit(eventType: string, leadId: string, payload: unknown) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("audit_events").insert({
    event_type: eventType,
    lead_id: leadId,
    payload
  });
}

function hasGmailConfig() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
}
