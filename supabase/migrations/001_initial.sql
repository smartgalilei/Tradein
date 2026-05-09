create extension if not exists pgcrypto;

create table if not exists merchants (
  id text primary key,
  name text not null,
  website_url text not null default '',
  public_email text not null,
  public_phone text not null default '',
  line_url text not null default '',
  contact_form_url text not null default '',
  categories jsonb not null default '[]'::jsonb,
  location jsonb not null default '{}'::jsonb,
  notes text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_status_check check (status in ('active', 'inactive', 'do_not_contact', 'needs_review'))
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  app_user_key text not null,
  customer_name text not null default '',
  customer_contact text not null default '',
  preferred_contact text not null default 'ChatGPT',
  vehicle jsonb not null,
  location jsonb not null,
  desired_price_man_yen numeric,
  sell_by text not null default '未定',
  notes text not null default '',
  status text not null default 'pending_merchant_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'pending_merchant_approval', 'sent_to_merchant', 'merchant_responded', 'feedback_ready', 'feedback_approved'))
);

create table if not exists outreach_attempts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  merchant_id text not null references merchants(id),
  channel text not null default 'email',
  destination text not null,
  generated_subject text not null,
  generated_message text not null,
  status text not null default 'pending_approval',
  gmail_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_channel_check check (channel in ('email')),
  constraint outreach_status_check check (status in ('pending_approval', 'sent', 'failed', 'responded', 'no_response'))
);

create table if not exists merchant_replies (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  outreach_attempt_id uuid references outreach_attempts(id) on delete set null,
  merchant_id text not null references merchants(id),
  gmail_message_id text unique,
  raw_from text,
  raw_subject text,
  raw_body text not null,
  quote_man_yen numeric,
  response_summary text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists user_feedbacks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references leads(id) on delete cascade,
  status text not null default 'draft',
  feedback_text text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_status_check check (status in ('draft', 'approved'))
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  lead_id uuid references leads(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table merchants enable row level security;
alter table leads enable row level security;
alter table outreach_attempts enable row level security;
alter table merchant_replies enable row level security;
alter table user_feedbacks enable row level security;
alter table audit_events enable row level security;

insert into merchants (
  id,
  name,
  website_url,
  public_email,
  public_phone,
  line_url,
  contact_form_url,
  categories,
  location,
  notes,
  status
) values (
  'm-test-amano-tokyo',
  '天野自動車東京店',
  '',
  'smartgalilei@gmail.com',
  '',
  '',
  '',
  '["ミニバン", "SUV", "セダン", "輸入車"]'::jsonb,
  '{"prefectures":["東京都","神奈川県","千葉県","埼玉県"],"city":"東京"}'::jsonb,
  'Phase 1 single merchant. Email-only outreach.',
  'active'
) on conflict (id) do update set
  name = excluded.name,
  public_email = excluded.public_email,
  categories = excluded.categories,
  location = excluded.location,
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();
