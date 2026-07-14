import { NextResponse } from "next/server";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

import { createSupabaseAdminClient } from "@/lib/sales-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanId = "free" | "starter" | "pro" | "agency";

type OwnerSettingsRow = {
  id: string;
  business_name: string;
  product_name: string;
  reporting_currency: string;
  support_email: string;
  selling_started_on?: string | null;
  usd_to_pkr_rate: number | string;
  openai_budget_pkr: number | string;
  monthly_revenue_target_pkr: number | string;
};

type SubscriptionRow = {
  plan?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
};

type PaymentEventRow = {
  id: string;
  event_key: string;
  event_name: string;
  customer_email?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  currency?: string | null;
  gross_amount_minor?: number | string | null;
  refunded_amount_minor?: number | string | null;
  tax_amount_minor?: number | string | null;
  fee_amount_minor?: number | string | null;
  lemon_order_id?: string | null;
  lemon_subscription_id?: string | null;
  occurred_at: string;
};

type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  entry_type: "investment" | "expense";
  amount: number | string;
  currency: string;
  expense_date: string;
  recurrence: string;
  vendor?: string | null;
  notes?: string | null;
  created_at: string;
};

type ApiUsageRow = {
  id: string;
  provider: string;
  service: string;
  operation: string;
  model?: string | null;
  input_tokens?: number | string | null;
  output_tokens?: number | string | null;
  total_tokens?: number | string | null;
  audio_seconds?: number | string | null;
  file_size_bytes?: number | string | null;
  estimated_cost_usd?: number | string | null;
  status: string;
  occurred_at: string;
};

const EXPENSE_CATEGORIES = [
  "domain",
  "hosting",
  "openai",
  "software",
  "marketing",
  "development",
  "design",
  "legal",
  "payment_fee",
  "tax",
  "salary",
  "office",
  "refund",
  "other"
] as const;

const RECURRENCE_OPTIONS = [
  "one_time",
  "monthly",
  "quarterly",
  "annual"
] as const;

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizePlan(value: unknown): PlanId {
  const plan = String(value || "")
    .trim()
    .toLowerCase();

  if (
    plan === "starter" ||
    plan === "pro" ||
    plan === "agency"
  ) {
    return plan;
  }

  return "free";
}

function getMonthRange(monthValue: string | null) {
  const now = new Date();

  const match = /^(\d{4})-(\d{2})$/.exec(
    String(monthValue || "")
  );

  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth();

  if (match) {
    const parsedYear = Number(match[1]);
    const parsedMonthIndex = Number(match[2]) - 1;

    if (
      parsedYear >= 2020 &&
      parsedYear <= 2100 &&
      parsedMonthIndex >= 0 &&
      parsedMonthIndex <= 11
    ) {
      year = parsedYear;
      monthIndex = parsedMonthIndex;
    }
  }

  const start = new Date(
    Date.UTC(year, monthIndex, 1, 0, 0, 0)
  );

  const end = new Date(
    Date.UTC(year, monthIndex + 1, 1, 0, 0, 0)
  );

  return {
    key: `${year}-${String(monthIndex + 1).padStart(
      2,
      "0"
    )}`,
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDateExclusive: end.toISOString().slice(0, 10)
  };
}

function dateIsInsideMonth(
  value: string | null | undefined,
  start: Date,
  end: Date
) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date >= start && date < end;
}

function dateOnlyIsInsideMonth(
  value: string | null | undefined,
  startDate: string,
  endDateExclusive: string
) {
  if (!value) {
    return false;
  }

  return value >= startDate && value < endDateExclusive;
}

function convertAmountToPkr(
  amount: number,
  currency: string | null | undefined,
  usdToPkrRate: number
) {
  const normalizedCurrency = String(currency || "PKR")
    .trim()
    .toUpperCase();

  if (normalizedCurrency === "PKR") {
    return amount;
  }

  if (
    normalizedCurrency === "USD" &&
    usdToPkrRate > 0
  ) {
    return amount * usdToPkrRate;
  }

  return 0;
}

function convertMinorAmountToPkr(
  amountMinor: unknown,
  currency: string | null | undefined,
  usdToPkrRate: number
) {
  return convertAmountToPkr(
    toNumber(amountMinor) / 100,
    currency,
    usdToPkrRate
  );
}

function isCurrentlyActiveStatus(status: unknown) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  return [
    "active",
    "on_trial",
    "trialing",
    "paid"
  ].includes(normalizedStatus);
}

function createEmptyPlanCounts(): Record<PlanId, number> {
  return {
    free: 0,
    starter: 0,
    pro: 0,
    agency: 0
  };
}

function getUniquePackageSales(
  paymentEvents: PaymentEventRow[]
) {
  const saleEvents = paymentEvents.filter((event) => {
    const eventName = String(event.event_name || "")
      .trim()
      .toLowerCase();

    const grossAmount = toNumber(
      event.gross_amount_minor
    );

    if (grossAmount <= 0) {
      return false;
    }

    if (
      eventName.includes("refund") ||
      eventName.includes("cancel")
    ) {
      return false;
    }

    return (
      eventName.includes("order_created") ||
      eventName.includes("subscription_created") ||
      eventName.includes(
        "subscription_payment_success"
      ) ||
      eventName.includes("payment_success")
    );
  });

  const uniqueSales = new Map<
    string,
    PaymentEventRow
  >();

  for (const event of saleEvents) {
    let uniqueKey = event.event_key;

    if (event.lemon_order_id) {
      uniqueKey = `order:${event.lemon_order_id}`;
    } else if (event.lemon_subscription_id) {
      uniqueKey = `subscription:${
        event.lemon_subscription_id
      }:${event.occurred_at.slice(0, 10)}`;
    }

    if (!uniqueSales.has(uniqueKey)) {
      uniqueSales.set(uniqueKey, event);
    }
  }

  return Array.from(uniqueSales.values());
}

function createErrorResponse(error: unknown) {
  if (error instanceof OwnerAccessError) {
    return NextResponse.json(
      {
        error: error.message
      },
      {
        status: error.status
      }
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Unable to load Owner Dashboard.";

  return NextResponse.json(
    {
      error: message
    },
    {
      status: 500
    }
  );
}

export async function GET(request: Request) {
  try {
    await requireOwnerUser();

    const requestUrl = new URL(request.url);

    const monthRange = getMonthRange(
      requestUrl.searchParams.get("month")
    );

    const admin = createSupabaseAdminClient();

    const [
      settingsResult,
      subscriptionsResult,
      paymentsResult,
      expensesResult,
      apiUsageResult
    ] = await Promise.all([
      admin
        .from("owner_settings")
        .select("*")
        .eq("singleton_key", "makzora-owner")
        .maybeSingle(),

      admin
        .from("subscriptions")
        .select(
          [
            "plan",
            "status",
            "current_period_start",
            "current_period_end",
            "updated_at"
          ].join(",")
        ),

      admin
        .from("owner_payment_events")
        .select(
          [
            "id",
            "event_key",
            "event_name",
            "customer_email",
            "plan",
            "subscription_status",
            "currency",
            "gross_amount_minor",
            "refunded_amount_minor",
            "tax_amount_minor",
            "fee_amount_minor",
            "lemon_order_id",
            "lemon_subscription_id",
            "occurred_at"
          ].join(",")
        )
        .order("occurred_at", {
          ascending: false
        }),

      admin
        .from("owner_expenses")
        .select(
          [
            "id",
            "title",
            "category",
            "entry_type",
            "amount",
            "currency",
            "expense_date",
            "recurrence",
            "vendor",
            "notes",
            "created_at"
          ].join(",")
        )
        .order("expense_date", {
          ascending: false
        }),

      admin
        .from("owner_api_usage")
        .select(
          [
            "id",
            "provider",
            "service",
            "operation",
            "model",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "audio_seconds",
            "file_size_bytes",
            "estimated_cost_usd",
            "status",
            "occurred_at"
          ].join(",")
        )
        .order("occurred_at", {
          ascending: false
        })
    ]);

    if (settingsResult.error) {
      throw new Error(
        `Unable to load owner settings: ${settingsResult.error.message}`
      );
    }

    if (subscriptionsResult.error) {
      throw new Error(
        `Unable to load subscriptions: ${subscriptionsResult.error.message}`
      );
    }

    if (paymentsResult.error) {
      throw new Error(
        `Unable to load payment events: ${paymentsResult.error.message}`
      );
    }

    if (expensesResult.error) {
      throw new Error(
        `Unable to load expenses: ${expensesResult.error.message}`
      );
    }

    if (apiUsageResult.error) {
      throw new Error(
        `Unable to load API usage: ${apiUsageResult.error.message}`
      );
    }

    const settings =
      (settingsResult.data ?? null) as unknown as
        | OwnerSettingsRow
        | null;

    if (!settings) {
      throw new Error(
        "Makzora Owner settings were not found."
      );
    }

    const subscriptions =
      (subscriptionsResult.data ?? []) as unknown as
        SubscriptionRow[];

    const paymentEvents =
      (paymentsResult.data ?? []) as unknown as
        PaymentEventRow[];

    const expenses =
      (expensesResult.data ?? []) as unknown as
        ExpenseRow[];

    const apiUsage =
      (apiUsageResult.data ?? []) as unknown as
        ApiUsageRow[];

    const usdToPkrRate = toNumber(
      settings.usd_to_pkr_rate
    );

    const planCounts = createEmptyPlanCounts();

    const activePaidPlanCounts =
      createEmptyPlanCounts();

    const statusCounts: Record<string, number> = {};

    for (const subscription of subscriptions) {
      const plan = normalizePlan(subscription.plan);

      planCounts[plan] += 1;

      const status = String(
        subscription.status || "unknown"
      )
        .trim()
        .toLowerCase();

      statusCounts[status] =
        (statusCounts[status] || 0) + 1;

      if (
        plan !== "free" &&
        isCurrentlyActiveStatus(subscription.status)
      ) {
        activePaidPlanCounts[plan] += 1;
      }
    }

    const monthlyPaymentEvents = paymentEvents.filter(
      (event) =>
        dateIsInsideMonth(
          event.occurred_at,
          monthRange.start,
          monthRange.end
        )
    );

    const uniquePackageSales = getUniquePackageSales(
      monthlyPaymentEvents
    );

    const packagesSoldByPlan =
      createEmptyPlanCounts();

    for (const sale of uniquePackageSales) {
      packagesSoldByPlan[
        normalizePlan(sale.plan)
      ] += 1;
    }

    let grossRevenuePkr = 0;
    let refundsPkr = 0;
    let paymentFeesPkr = 0;
    let taxesPkr = 0;

    const revenueByCurrency: Record<string, number> =
      {};

    for (const event of monthlyPaymentEvents) {
      const currency = String(
        event.currency || "USD"
      )
        .trim()
        .toUpperCase();

      const grossAmount =
        toNumber(event.gross_amount_minor) / 100;

      revenueByCurrency[currency] =
        (revenueByCurrency[currency] || 0) +
        grossAmount;

      grossRevenuePkr +=
        convertMinorAmountToPkr(
          event.gross_amount_minor,
          currency,
          usdToPkrRate
        );

      refundsPkr +=
        convertMinorAmountToPkr(
          event.refunded_amount_minor,
          currency,
          usdToPkrRate
        );

      paymentFeesPkr +=
        convertMinorAmountToPkr(
          event.fee_amount_minor,
          currency,
          usdToPkrRate
        );

      taxesPkr +=
        convertMinorAmountToPkr(
          event.tax_amount_minor,
          currency,
          usdToPkrRate
        );
    }

    const netRevenuePkr = Math.max(
      grossRevenuePkr -
        refundsPkr -
        paymentFeesPkr,
      0
    );

    const monthlyExpenses = expenses.filter(
      (expense) =>
        dateOnlyIsInsideMonth(
          expense.expense_date,
          monthRange.startDate,
          monthRange.endDateExclusive
        )
    );

    let monthlyInvestmentsPkr = 0;
    let monthlyOperatingExpensesPkr = 0;

    for (const expense of monthlyExpenses) {
      const amountPkr = convertAmountToPkr(
        toNumber(expense.amount),
        expense.currency,
        usdToPkrRate
      );

      if (expense.entry_type === "investment") {
        monthlyInvestmentsPkr += amountPkr;
      } else {
        monthlyOperatingExpensesPkr += amountPkr;
      }
    }

    const lifetimeInvestmentPkr = expenses
      .filter(
        (expense) =>
          expense.entry_type === "investment"
      )
      .reduce(
        (total, expense) =>
          total +
          convertAmountToPkr(
            toNumber(expense.amount),
            expense.currency,
            usdToPkrRate
          ),
        0
      );

    const monthlyApiUsage = apiUsage.filter(
      (entry) =>
        dateIsInsideMonth(
          entry.occurred_at,
          monthRange.start,
          monthRange.end
        )
    );

    const monthlyApiCostUsd =
      monthlyApiUsage.reduce(
        (total, entry) =>
          total +
          toNumber(entry.estimated_cost_usd),
        0
      );

    const monthlyApiCostPkr =
      usdToPkrRate > 0
        ? monthlyApiCostUsd * usdToPkrRate
        : 0;

    const totalInputTokens =
      monthlyApiUsage.reduce(
        (total, entry) =>
          total + toNumber(entry.input_tokens),
        0
      );

    const totalOutputTokens =
      monthlyApiUsage.reduce(
        (total, entry) =>
          total + toNumber(entry.output_tokens),
        0
      );

    const totalAudioSeconds =
      monthlyApiUsage.reduce(
        (total, entry) =>
          total + toNumber(entry.audio_seconds),
        0
      );

    const openAiBudgetPkr = toNumber(
      settings.openai_budget_pkr
    );

    const remainingOpenAiBudgetPkr = Math.max(
      openAiBudgetPkr - monthlyApiCostPkr,
      0
    );

    const cashProfitPkr =
      netRevenuePkr -
      monthlyInvestmentsPkr -
      monthlyOperatingExpensesPkr;

    const operatingProfitPkr =
      netRevenuePkr -
      monthlyOperatingExpensesPkr -
      monthlyApiCostPkr;

    return NextResponse.json({
      success: true,

      month: {
        key: monthRange.key,
        start: monthRange.startDate,
        endExclusive: monthRange.endDateExclusive
      },

      settings: {
        id: settings.id,
        businessName: settings.business_name,
        productName: settings.product_name,
        reportingCurrency:
          settings.reporting_currency,
        supportEmail: settings.support_email,
        sellingStartedOn:
          settings.selling_started_on || null,
        usdToPkrRate,
        openAiBudgetPkr,
        monthlyRevenueTargetPkr: toNumber(
          settings.monthly_revenue_target_pkr
        )
      },

      subscribers: {
        total: subscriptions.length,
        byPlan: planCounts,
        activePaidByPlan: activePaidPlanCounts,
        byStatus: statusCounts,
        activePaidTotal:
          activePaidPlanCounts.starter +
          activePaidPlanCounts.pro +
          activePaidPlanCounts.agency
      },

      sales: {
        packagesSold: uniquePackageSales.length,
        packagesSoldByPlan
      },

      revenue: {
        grossRevenuePkr,
        refundsPkr,
        paymentFeesPkr,
        taxesPkr,
        netRevenuePkr,
        revenueByCurrency
      },

      costs: {
        monthlyInvestmentsPkr,
        monthlyOperatingExpensesPkr,
        lifetimeInvestmentPkr,
        monthlyApiCostUsd,
        monthlyApiCostPkr,
        totalMonthlyCashOutflowPkr:
          monthlyInvestmentsPkr +
          monthlyOperatingExpensesPkr
      },

      profit: {
        cashProfitPkr,
        operatingProfitPkr
      },

      apiUsage: {
        requests: monthlyApiUsage.length,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens:
          totalInputTokens + totalOutputTokens,
        audioSeconds: totalAudioSeconds,
        estimatedCostUsd: monthlyApiCostUsd,
        estimatedCostPkr: monthlyApiCostPkr,
        budgetPkr: openAiBudgetPkr,
        remainingBudgetPkr:
          remainingOpenAiBudgetPkr
      },

      recentExpenses: expenses.slice(0, 20),
      recentPayments: paymentEvents.slice(0, 20),
      recentApiUsage: apiUsage.slice(0, 20),

      dataStatus: {
        paymentTrackingConnected:
          paymentEvents.length > 0,
        apiTrackingConnected:
          apiUsage.length > 0,
        exchangeRateConfigured:
          usdToPkrRate > 0
      }
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwnerUser();
    const admin = createSupabaseAdminClient();

    const body = await request.json();

    const action = String(
      body.action || "expense"
    )
      .trim()
      .toLowerCase();

    if (action === "settings") {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (
        typeof body.selling_started_on === "string"
      ) {
        updatePayload.selling_started_on =
          body.selling_started_on || null;
      }

      if (body.usd_to_pkr_rate !== undefined) {
        const rate = toNumber(
          body.usd_to_pkr_rate
        );

        if (rate < 0) {
          return NextResponse.json(
            {
              error:
                "USD to PKR rate cannot be negative."
            },
            {
              status: 400
            }
          );
        }

        updatePayload.usd_to_pkr_rate = rate;
      }

      if (body.openai_budget_pkr !== undefined) {
        const budget = toNumber(
          body.openai_budget_pkr
        );

        if (budget < 0) {
          return NextResponse.json(
            {
              error:
                "OpenAI budget cannot be negative."
            },
            {
              status: 400
            }
          );
        }

        updatePayload.openai_budget_pkr =
          budget;
      }

      if (
        body.monthly_revenue_target_pkr !==
        undefined
      ) {
        const target = toNumber(
          body.monthly_revenue_target_pkr
        );

        if (target < 0) {
          return NextResponse.json(
            {
              error:
                "Revenue target cannot be negative."
            },
            {
              status: 400
            }
          );
        }

        updatePayload.monthly_revenue_target_pkr =
          target;
      }

      const {
        data,
        error
      } = await admin
        .from("owner_settings")
        .update(updatePayload)
        .eq("singleton_key", "makzora-owner")
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Unable to update Owner settings: ${error.message}`
        );
      }

      return NextResponse.json({
        success: true,
        settings: data
      });
    }

    if (action !== "expense") {
      return NextResponse.json(
        {
          error:
            "Unsupported Owner Dashboard action."
        },
        {
          status: 400
        }
      );
    }

    const title = String(body.title || "").trim();

    const amount = toNumber(body.amount);

    const currency = String(
      body.currency || "PKR"
    )
      .trim()
      .toUpperCase();

    const category = String(
      body.category || "other"
    )
      .trim()
      .toLowerCase();

    const entryType = String(
      body.entry_type || "expense"
    )
      .trim()
      .toLowerCase();

    const recurrence = String(
      body.recurrence || "one_time"
    )
      .trim()
      .toLowerCase();

    const expenseDate = String(
      body.expense_date ||
        new Date().toISOString().slice(0, 10)
    ).trim();

    if (!title) {
      return NextResponse.json(
        {
          error: "Expense title is required."
        },
        {
          status: 400
        }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Expense amount must be greater than zero."
        },
        {
          status: 400
        }
      );
    }

    if (
      !EXPENSE_CATEGORIES.includes(
        category as (typeof EXPENSE_CATEGORIES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid expense category."
        },
        {
          status: 400
        }
      );
    }

    if (
      entryType !== "investment" &&
      entryType !== "expense"
    ) {
      return NextResponse.json(
        {
          error:
            "Entry type must be investment or expense."
        },
        {
          status: 400
        }
      );
    }

    if (
      !RECURRENCE_OPTIONS.includes(
        recurrence as (typeof RECURRENCE_OPTIONS)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid recurrence option."
        },
        {
          status: 400
        }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Expense date must use YYYY-MM-DD format."
        },
        {
          status: 400
        }
      );
    }

    const {
      data,
      error
    } = await admin
      .from("owner_expenses")
      .insert({
        title,
        category,
        entry_type: entryType,
        amount,
        currency,
        expense_date: expenseDate,
        recurrence,
        vendor:
          String(body.vendor || "").trim() || null,
        notes:
          String(body.notes || "").trim() || null,
        created_by: owner.id
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Unable to save expense: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
      expense: data
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}