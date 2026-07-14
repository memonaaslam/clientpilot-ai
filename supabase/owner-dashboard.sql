-- =========================================================
-- CLIENTPILOT AI BY MAKZORA
-- OWNER DASHBOARD DATABASE FOUNDATION
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_owner_dashboard_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- OWNER SETTINGS
-- One global Makzora business configuration record
-- =========================================================

create table if not exists public.owner_settings (
  id uuid primary key default gen_random_uuid(),

  singleton_key text not null default 'makzora-owner',
  business_name text not null default 'Makzora',
  product_name text not null default 'ClientPilot AI',

  reporting_currency text not null default 'PKR',
  support_email text not null default 'info@makzora.com',

  selling_started_on date,
  usd_to_pkr_rate numeric(12, 4) not null default 0,

  openai_budget_pkr numeric(14, 2) not null default 2000,
  monthly_revenue_target_pkr numeric(14, 2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint owner_settings_singleton_key_unique
    unique (singleton_key),

  constraint owner_settings_singleton_key_check
    check (singleton_key = 'makzora-owner'),

  constraint owner_settings_openai_budget_check
    check (openai_budget_pkr >= 0),

  constraint owner_settings_revenue_target_check
    check (monthly_revenue_target_pkr >= 0),

  constraint owner_settings_exchange_rate_check
    check (usd_to_pkr_rate >= 0)
);

drop trigger if exists owner_settings_updated_at
on public.owner_settings;

create trigger owner_settings_updated_at
before update on public.owner_settings
for each row
execute function public.set_owner_dashboard_updated_at();

-- =========================================================
-- BUSINESS EXPENSES AND INVESTMENTS
-- =========================================================

create table if not exists public.owner_expenses (
  id uuid primary key default gen_random_uuid(),

  source_key text unique,

  title text not null,
  category text not null default 'other',

  entry_type text not null default 'expense',
  amount numeric(14, 2) not null,
  currency text not null default 'PKR',

  expense_date date not null default current_date,
  recurrence text not null default 'one_time',

  vendor text,
  notes text,

  created_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint owner_expenses_amount_check
    check (amount >= 0),

  constraint owner_expenses_type_check
    check (
      entry_type in (
        'investment',
        'expense'
      )
    ),

  constraint owner_expenses_category_check
    check (
      category in (
        'domain',
        'hosting',
        'openai',
        'software',
        'marketing',
        'development',
        'design',
        'legal',
        'payment_fee',
        'tax',
        'salary',
        'office',
        'refund',
        'other'
      )
    ),

  constraint owner_expenses_recurrence_check
    check (
      recurrence in (
        'one_time',
        'monthly',
        'quarterly',
        'annual'
      )
    )
);

drop trigger if exists owner_expenses_updated_at
on public.owner_expenses;

create trigger owner_expenses_updated_at
before update on public.owner_expenses
for each row
execute function public.set_owner_dashboard_updated_at();

create index if not exists owner_expenses_date_index
on public.owner_expenses (expense_date desc);

create index if not exists owner_expenses_category_index
on public.owner_expenses (category);

create index if not exists owner_expenses_type_index
on public.owner_expenses (entry_type);

-- =========================================================
-- PAYMENT AND SUBSCRIPTION EVENT LEDGER
-- Saves every future Lemon Squeezy event separately
-- =========================================================

create table if not exists public.owner_payment_events (
  id uuid primary key default gen_random_uuid(),

  event_key text not null unique,

  provider text not null default 'lemon_squeezy',
  event_name text not null,

  user_id uuid references auth.users(id)
    on delete set null,

  customer_email text,

  plan text,
  subscription_status text,

  currency text not null default 'USD',

  gross_amount_minor bigint not null default 0,
  refunded_amount_minor bigint not null default 0,
  tax_amount_minor bigint not null default 0,
  fee_amount_minor bigint not null default 0,

  lemon_customer_id text,
  lemon_subscription_id text,
  lemon_order_id text,
  lemon_product_id text,
  lemon_variant_id text,

  occurred_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint owner_payment_provider_check
    check (
      provider in (
        'lemon_squeezy',
        'stripe',
        'manual'
      )
    ),

  constraint owner_payment_plan_check
    check (
      plan is null or
      plan in (
        'free',
        'starter',
        'pro',
        'agency'
      )
    ),

  constraint owner_payment_gross_check
    check (gross_amount_minor >= 0),

  constraint owner_payment_refund_check
    check (refunded_amount_minor >= 0),

  constraint owner_payment_tax_check
    check (tax_amount_minor >= 0),

  constraint owner_payment_fee_check
    check (fee_amount_minor >= 0)
);

create index if not exists owner_payment_events_date_index
on public.owner_payment_events (occurred_at desc);

create index if not exists owner_payment_events_plan_index
on public.owner_payment_events (plan);

create index if not exists owner_payment_events_user_index
on public.owner_payment_events (user_id);

create index if not exists owner_payment_events_subscription_index
on public.owner_payment_events (lemon_subscription_id);

create index if not exists owner_payment_events_order_index
on public.owner_payment_events (lemon_order_id);

-- =========================================================
-- OPENAI AND API USAGE LEDGER
-- =========================================================

create table if not exists public.owner_api_usage (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id)
    on delete set null,

  meeting_id uuid,

  provider text not null default 'openai',
  service text not null,
  operation text not null,
  model text,

  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,

  audio_seconds numeric(14, 3) not null default 0,
  file_size_bytes bigint not null default 0,

  estimated_cost_usd numeric(16, 8) not null default 0,

  status text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint owner_api_input_tokens_check
    check (input_tokens >= 0),

  constraint owner_api_output_tokens_check
    check (output_tokens >= 0),

  constraint owner_api_total_tokens_check
    check (total_tokens >= 0),

  constraint owner_api_audio_seconds_check
    check (audio_seconds >= 0),

  constraint owner_api_file_size_check
    check (file_size_bytes >= 0),

  constraint owner_api_cost_check
    check (estimated_cost_usd >= 0),

  constraint owner_api_status_check
    check (
      status in (
        'success',
        'failed',
        'fallback'
      )
    )
);

create index if not exists owner_api_usage_date_index
on public.owner_api_usage (occurred_at desc);

create index if not exists owner_api_usage_user_index
on public.owner_api_usage (user_id);

create index if not exists owner_api_usage_model_index
on public.owner_api_usage (model);

create index if not exists owner_api_usage_service_index
on public.owner_api_usage (service);

-- =========================================================
-- MONTHLY OWNER REPORT SNAPSHOTS
-- =========================================================

create table if not exists public.owner_monthly_reports (
  id uuid primary key default gen_random_uuid(),

  month_start date not null unique,
  reporting_currency text not null default 'PKR',

  free_subscribers integer not null default 0,
  starter_subscribers integer not null default 0,
  pro_subscribers integer not null default 0,
  agency_subscribers integer not null default 0,

  packages_sold integer not null default 0,

  gross_revenue numeric(16, 2) not null default 0,
  refunds numeric(16, 2) not null default 0,
  payment_fees numeric(16, 2) not null default 0,

  investments numeric(16, 2) not null default 0,
  operating_expenses numeric(16, 2) not null default 0,
  api_cost numeric(16, 2) not null default 0,

  net_profit numeric(16, 2) not null default 0,

  report_data jsonb not null default '{}'::jsonb,

  generated_by uuid references auth.users(id)
    on delete set null,

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint owner_monthly_reports_month_check
    check (
      month_start =
      date_trunc('month', month_start)::date
    ),

  constraint owner_monthly_reports_counts_check
    check (
      free_subscribers >= 0 and
      starter_subscribers >= 0 and
      pro_subscribers >= 0 and
      agency_subscribers >= 0 and
      packages_sold >= 0
    )
);

drop trigger if exists owner_monthly_reports_updated_at
on public.owner_monthly_reports;

create trigger owner_monthly_reports_updated_at
before update on public.owner_monthly_reports
for each row
execute function public.set_owner_dashboard_updated_at();

create index if not exists owner_monthly_reports_month_index
on public.owner_monthly_reports (month_start desc);

-- =========================================================
-- SECURE TABLES
-- No browser policies are created.
-- These tables will be accessed only through owner-only
-- server API routes using the Supabase service role.
-- =========================================================

alter table public.owner_settings
enable row level security;

alter table public.owner_expenses
enable row level security;

alter table public.owner_payment_events
enable row level security;

alter table public.owner_api_usage
enable row level security;

alter table public.owner_monthly_reports
enable row level security;

-- =========================================================
-- INITIAL MAKZORA SETTINGS
-- =========================================================

insert into public.owner_settings (
  singleton_key,
  business_name,
  product_name,
  reporting_currency,
  support_email,
  openai_budget_pkr
)
values (
  'makzora-owner',
  'Makzora',
  'ClientPilot AI',
  'PKR',
  'info@makzora.com',
  2000
)
on conflict (singleton_key)
do update set
  business_name = excluded.business_name,
  product_name = excluded.product_name,
  reporting_currency = excluded.reporting_currency,
  support_email = excluded.support_email;

-- =========================================================
-- INITIAL BUSINESS INVESTMENTS
-- Safe to run more than once because source_key is unique.
-- Dates can be edited later from the Owner Dashboard.
-- =========================================================

insert into public.owner_expenses (
  source_key,
  title,
  category,
  entry_type,
  amount,
  currency,
  expense_date,
  recurrence,
  vendor,
  notes
)
values (
  'initial-domain-investment',
  'Makzora domain – one year',
  'domain',
  'investment',
  4000,
  'PKR',
  current_date,
  'annual',
  'Domain provider',
  'Initial owner entry. Update the exact payment date if required.'
)
on conflict (source_key)
do nothing;

insert into public.owner_expenses (
  source_key,
  title,
  category,
  entry_type,
  amount,
  currency,
  expense_date,
  recurrence,
  vendor,
  notes
)
values (
  'initial-openai-investment',
  'Initial OpenAI API credits',
  'openai',
  'investment',
  2000,
  'PKR',
  current_date,
  'one_time',
  'OpenAI',
  'Initial OpenAI/API investment entered for the Owner Dashboard.'
)
on conflict (source_key)
do nothing;