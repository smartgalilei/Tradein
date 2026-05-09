export type LeadStatus =
  | "new"
  | "pending_merchant_approval"
  | "sent_to_merchant"
  | "merchant_responded"
  | "feedback_ready"
  | "feedback_approved";

export type OutreachStatus =
  | "pending_approval"
  | "sent"
  | "failed"
  | "responded"
  | "no_response";

export type FeedbackStatus = "draft" | "approved";

export type Merchant = {
  id: string;
  name: string;
  website_url: string;
  public_email: string;
  public_phone: string;
  line_url: string;
  contact_form_url: string;
  categories: string[];
  location: {
    prefectures: string[];
    city: string;
  };
  notes: string;
  status: "active" | "inactive" | "do_not_contact" | "needs_review";
};

export type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  category?: string;
  condition?: string;
  accident_history?: string;
  inspection_remaining?: string;
  photos?: string[];
};

export type Lead = {
  id: string;
  app_user_key: string;
  customer_name?: string;
  customer_contact?: string;
  preferred_contact?: string;
  vehicle: VehicleInfo;
  location: {
    prefecture: string;
    city?: string;
  };
  desired_price_man_yen?: number | null;
  sell_by?: string;
  notes?: string;
  status: LeadStatus;
  created_at: string;
  updated_at?: string;
};

export type OutreachAttempt = {
  id: string;
  lead_id: string;
  merchant_id: string;
  channel: "email";
  destination: string;
  generated_subject: string;
  generated_message: string;
  status: OutreachStatus;
  gmail_message_id?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type MerchantReply = {
  id: string;
  lead_id: string;
  outreach_attempt_id?: string | null;
  merchant_id: string;
  gmail_message_id?: string | null;
  raw_from?: string | null;
  raw_subject?: string | null;
  raw_body: string;
  quote_man_yen?: number | null;
  response_summary: string;
  received_at: string;
  created_at: string;
};

export type UserFeedback = {
  id: string;
  lead_id: string;
  status: FeedbackStatus;
  feedback_text: string;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type AdminOverview = {
  leads: Lead[];
  merchant: Merchant;
  outreachAttempts: OutreachAttempt[];
  replies: MerchantReply[];
  feedbacks: UserFeedback[];
  mode: "supabase" | "memory";
  gmailConfigured: boolean;
};
