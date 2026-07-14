import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createSupabaseAdminClient
} from "@/lib/sales-session";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type OwnerSettingsRow = {
  business_name: string;
  product_name: string;
  reporting_currency: string;
  support_email: string;
  selling_started_on?: string | null;
  usd_to_pkr_rate?: number | string | null;
  openai_budget_pkr?: number | string | null;
  monthly_revenue_target_pkr?:
    | number
    | string
    | null;
};

type SubscriptionRow = {
  plan?: string | null;
  status?: string | null;
};

type PaymentEventRow = {
  id: string;
  event_name: string;
  event_key?: string | null;
  plan?: string | null;
  currency?: string | null;
  gross_amount_minor?:
    | number
    | string
    | null;
  refunded_amount_minor?:
    | number
    | string
    | null;
  tax_amount_minor?:
    | number
    | string
    | null;
  fee_amount_minor?:
    | number
    | string
    | null;
  occurred_at: string;
};

type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  entry_type: string;
  amount: number | string;
  currency: string;
  expense_date: string;
  recurrence: string;
  vendor?: string | null;
  notes?: string | null;
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
  estimated_cost_usd?:
    | number
    | string
    | null;
  status: string;
  occurred_at: string;
};

type PlanCounts = {
  free: number;
  starter: number;
  pro: number;
  agency: number;
};

function verifyCronAuthorization(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error(
      "CRON_SECRET is not configured."
    );
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${cronSecret}`
  );
}

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function toMoney(value: unknown) {
  return Number(
    Math.max(0, toNumber(value)).toFixed(2)
  );
}

function toSignedMoney(value: unknown) {
  return Number(
    toNumber(value).toFixed(2)
  );
}

function normalizePlan(
  value: unknown
): keyof PlanCounts {
  const plan = String(
    value || ""
  ).toLowerCase();

  if (
    plan === "starter" ||
    plan === "pro" ||
    plan === "agency"
  ) {
    return plan;
  }

  return "free";
}

function emptyPlanCounts(): PlanCounts {
  return {
    free: 0,
    starter: 0,
    pro: 0,
    agency: 0
  };
}

function isValidMonth(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    month
  );
}

function getPreviousMonthKey(
  now = new Date()
) {
  const previousMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
      1
    )
  );

  return [
    previousMonth.getUTCFullYear(),
    String(
      previousMonth.getUTCMonth() + 1
    ).padStart(2, "0")
  ].join("-");
}

function getMonthRange(month: string) {
  const [yearText, monthText] =
    month.split("-");

  const year = Number(yearText);
  const monthIndex =
    Number(monthText) - 1;

  const startDate =
    `${yearText}-${monthText}-01`;

  const start = new Date(
    Date.UTC(year, monthIndex, 1)
  );

  const end = new Date(
    Date.UTC(year, monthIndex + 1, 1)
  );

  return {
    key: month,
    startDate,
    endDateExclusive:
      end.toISOString().slice(0, 10),
    start:
      start.toISOString(),
    end:
      end.toISOString()
  };
}

function dateIsInsideMonth(
  value: string,
  start: string,
  end: string
) {
  const time =
    new Date(value).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  return (
    time >= new Date(start).getTime() &&
    time < new Date(end).getTime()
  );
}

function dateOnlyIsInsideMonth(
  value: string,
  startDate: string,
  endDateExclusive: string
) {
  const date = String(value || "")
    .slice(0, 10);

  return (
    date >= startDate &&
    date < endDateExclusive
  );
}

function convertMinorToPkr(
  amountMinor: unknown,
  currency: unknown,
  usdToPkrRate: number
) {
  const amount =
    toNumber(amountMinor) / 100;

  const normalizedCurrency =
    String(currency || "USD")
      .trim()
      .toUpperCase();

  if (normalizedCurrency === "PKR") {
    return amount;
  }

  if (normalizedCurrency === "USD") {
    return amount * usdToPkrRate;
  }

  /*
    Unknown currencies are kept out of PKR totals
    rather than applying an incorrect conversion.
  */
  return 0;
}

function convertAmountToPkr(
  amount: unknown,
  currency: unknown,
  usdToPkrRate: number
) {
  const numericAmount =
    toNumber(amount);

  const normalizedCurrency =
    String(currency || "PKR")
      .trim()
      .toUpperCase();

  if (normalizedCurrency === "PKR") {
    return numericAmount;
  }

  if (normalizedCurrency === "USD") {
    return numericAmount * usdToPkrRate;
  }

  return 0;
}

function isSuccessfulPayment(
  event: PaymentEventRow
) {
  return (
    event.event_name ===
      "subscription_payment_success" &&
    toNumber(
      event.gross_amount_minor
    ) > 0
  );
}

function isPaidPlan(
  plan: keyof PlanCounts
) {
  return plan !== "free";
}

function isActivePaidStatus(
  status: unknown
) {
  const normalizedStatus =
    String(status || "")
      .trim()
      .toLowerCase();

  return ![
    "expired",
    "inactive",
    "unpaid"
  ].includes(normalizedStatus);
}

function createErrorResponse(
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : "Automatic monthly Owner report failed.";

  console.error(
    "Monthly Owner report cron error:",
    error
  );

  return NextResponse.json(
    {
      error: message
    },
    {
      status: 500
    }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !verifyCronAuthorization(request)
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized cron request."
        },
        {
          status: 401
        }
      );
    }

    const requestedMonth =
      request.nextUrl.searchParams
        .get("month")
        ?.trim() || "";

    const month =
      requestedMonth ||
      getPreviousMonthKey();

    if (!isValidMonth(month)) {
      return NextResponse.json(
        {
          error:
            "Month must use YYYY-MM format."
        },
        {
          status: 400
        }
      );
    }

    const monthRange =
      getMonthRange(month);

    const admin =
      createSupabaseAdminClient();

    const {
      data: existingReport,
      error: existingReportError
    } = await admin
      .from("owner_monthly_reports")
      .select(
        "id,month_start,generated_at"
      )
      .eq(
        "month_start",
        monthRange.startDate
      )
      .maybeSingle();

    if (existingReportError) {
      throw new Error(
        `Unable to check the monthly report: ${existingReportError.message}`
      );
    }

    if (existingReport) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason:
          "A permanent report already exists for this month.",
        month,
        report: existingReport
      });
    }

    const [
      settingsResult,
      subscriptionsResult,
      paymentsResult,
      expensesResult,
      apiUsageResult
    ] = await Promise.all([
      admin
        .from("owner_settings")
        .select(
          [
            "business_name",
            "product_name",
            "reporting_currency",
            "support_email",
            "selling_started_on",
            "usd_to_pkr_rate",
            "openai_budget_pkr",
            "monthly_revenue_target_pkr"
          ].join(",")
        )
        .eq(
          "singleton_key",
          "makzora-owner"
        )
        .maybeSingle(),

      admin
        .from("subscriptions")
        .select("plan,status"),

      admin
        .from("owner_payment_events")
        .select(
          [
            "id",
            "event_name",
            "event_key",
            "plan",
            "currency",
            "gross_amount_minor",
            "refunded_amount_minor",
            "tax_amount_minor",
            "fee_amount_minor",
            "occurred_at"
          ].join(",")
        )
        .gte(
          "occurred_at",
          monthRange.start
        )
        .lt(
          "occurred_at",
          monthRange.end
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
            "notes"
          ].join(",")
        )
        .gte(
          "expense_date",
          monthRange.startDate
        )
        .lt(
          "expense_date",
          monthRange.endDateExclusive
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
        .gte(
          "occurred_at",
          monthRange.start
        )
        .lt(
          "occurred_at",
          monthRange.end
        )
        .order("occurred_at", {
          ascending: false
        })
    ]);

    if (settingsResult.error) {
      throw new Error(
        `Unable to load Owner settings: ${settingsResult.error.message}`
      );
    }

    if (!settingsResult.data) {
      throw new Error(
        "Makzora Owner settings were not found."
      );
    }

    if (subscriptionsResult.error) {
      throw new Error(
        `Unable to load subscriptions: ${subscriptionsResult.error.message}`
      );
    }

    if (paymentsResult.error) {
      throw new Error(
        `Unable to load payments: ${paymentsResult.error.message}`
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
      settingsResult.data as unknown as OwnerSettingsRow;

    const subscriptions =
      (subscriptionsResult.data ||
        []) as unknown as SubscriptionRow[];

    const paymentEvents =
      (paymentsResult.data ||
        []) as unknown as PaymentEventRow[];

    const expenses =
      (expensesResult.data ||
        []) as unknown as ExpenseRow[];

    const apiUsage =
      (apiUsageResult.data ||
        []) as unknown as ApiUsageRow[];

    const usdToPkrRate =
      toNumber(
        settings.usd_to_pkr_rate
      );

    const planCounts =
      emptyPlanCounts();

    const activePaidPlanCounts =
      emptyPlanCounts();

    const statusCounts:
      Record<string, number> = {};

    for (
      const subscription of subscriptions
    ) {
      const plan = normalizePlan(
        subscription.plan
      );

      const status =
        String(
          subscription.status ||
            "unknown"
        ).toLowerCase();

      planCounts[plan] += 1;

      statusCounts[status] =
        (statusCounts[status] || 0) + 1;

      if (
        isPaidPlan(plan) &&
        isActivePaidStatus(status)
      ) {
        activePaidPlanCounts[plan] += 1;
      }
    }

    const monthlyPaymentEvents =
      paymentEvents.filter((event) =>
        dateIsInsideMonth(
          event.occurred_at,
          monthRange.start,
          monthRange.end
        )
      );

    const successfulPayments =
      monthlyPaymentEvents.filter(
        isSuccessfulPayment
      );

    const packagesSoldByPlan =
      emptyPlanCounts();

    for (
      const payment of successfulPayments
    ) {
      const plan =
        normalizePlan(payment.plan);

      packagesSoldByPlan[plan] += 1;
    }

    const grossRevenuePkr =
      successfulPayments.reduce(
        (total, payment) =>
          total +
          convertMinorToPkr(
            payment.gross_amount_minor,
            payment.currency,
            usdToPkrRate
          ),
        0
      );

    const refundsPkr =
      monthlyPaymentEvents.reduce(
        (total, payment) =>
          total +
          convertMinorToPkr(
            payment.refunded_amount_minor,
            payment.currency,
            usdToPkrRate
          ),
        0
      );

    const paymentFeesPkr =
      monthlyPaymentEvents.reduce(
        (total, payment) =>
          total +
          convertMinorToPkr(
            payment.fee_amount_minor,
            payment.currency,
            usdToPkrRate
          ),
        0
      );

    const taxesPkr =
      successfulPayments.reduce(
        (total, payment) =>
          total +
          convertMinorToPkr(
            payment.tax_amount_minor,
            payment.currency,
            usdToPkrRate
          ),
        0
      );

    const netRevenuePkr =
      grossRevenuePkr -
      refundsPkr -
      paymentFeesPkr;

    const revenueByCurrency:
      Record<string, number> = {};

    for (
      const payment of successfulPayments
    ) {
      const currency =
        String(
          payment.currency || "USD"
        ).toUpperCase();

      revenueByCurrency[currency] =
        (revenueByCurrency[currency] ||
          0) +
        toNumber(
          payment.gross_amount_minor
        ) /
          100;
    }

    const monthlyExpenses =
      expenses.filter((expense) =>
        dateOnlyIsInsideMonth(
          expense.expense_date,
          monthRange.startDate,
          monthRange.endDateExclusive
        )
      );

    let monthlyInvestmentsPkr = 0;
    let monthlyOperatingExpensesPkr = 0;

    for (
      const expense of monthlyExpenses
    ) {
      const amountPkr =
        convertAmountToPkr(
          expense.amount,
          expense.currency,
          usdToPkrRate
        );

      if (
        expense.entry_type ===
        "investment"
      ) {
        monthlyInvestmentsPkr +=
          amountPkr;
      } else {
        monthlyOperatingExpensesPkr +=
          amountPkr;
      }
    }

    const monthlyApiCostUsd =
      apiUsage.reduce(
        (total, entry) =>
          total +
          toNumber(
            entry.estimated_cost_usd
          ),
        0
      );

    const monthlyApiCostPkr =
      monthlyApiCostUsd *
      usdToPkrRate;

    const totalInputTokens =
      apiUsage.reduce(
        (total, entry) =>
          total +
          toNumber(entry.input_tokens),
        0
      );

    const totalOutputTokens =
      apiUsage.reduce(
        (total, entry) =>
          total +
          toNumber(entry.output_tokens),
        0
      );

    const totalAudioSeconds =
      apiUsage.reduce(
        (total, entry) =>
          total +
          toNumber(entry.audio_seconds),
        0
      );

    const openAiBudgetPkr =
      toNumber(
        settings.openai_budget_pkr
      );

    const remainingOpenAiBudgetPkr =
      Math.max(
        openAiBudgetPkr -
          monthlyApiCostPkr,
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

    const generatedAt =
      new Date().toISOString();

    const reportData = {
      month: {
        key: monthRange.key,
        start:
          monthRange.startDate,
        endExclusive:
          monthRange.endDateExclusive
      },

      settings: {
        businessName:
          settings.business_name,
        productName:
          settings.product_name,
        reportingCurrency:
          settings.reporting_currency,
        supportEmail:
          settings.support_email,
        sellingStartedOn:
          settings.selling_started_on ||
          null,
        usdToPkrRate,
        openAiBudgetPkr,
        monthlyRevenueTargetPkr:
          toNumber(
            settings.monthly_revenue_target_pkr
          )
      },

      subscribers: {
        total: subscriptions.length,
        byPlan: planCounts,
        activePaidByPlan:
          activePaidPlanCounts,
        byStatus: statusCounts,
        activePaidTotal:
          activePaidPlanCounts.starter +
          activePaidPlanCounts.pro +
          activePaidPlanCounts.agency
      },

      sales: {
        packagesSold:
          successfulPayments.length,
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
        requests: apiUsage.length,
        inputTokens:
          totalInputTokens,
        outputTokens:
          totalOutputTokens,
        totalTokens:
          totalInputTokens +
          totalOutputTokens,
        audioSeconds:
          totalAudioSeconds,
        estimatedCostUsd:
          monthlyApiCostUsd,
        estimatedCostPkr:
          monthlyApiCostPkr,
        budgetPkr:
          openAiBudgetPkr,
        remainingBudgetPkr:
          remainingOpenAiBudgetPkr
      },

      recentExpenses:
        monthlyExpenses.slice(0, 20),

      recentPayments:
        monthlyPaymentEvents.slice(
          0,
          20
        ),

      recentApiUsage:
        apiUsage.slice(0, 20),

      dataStatus: {
        paymentTrackingConnected:
          paymentEvents.length > 0,
        apiTrackingConnected:
          apiUsage.length > 0,
        exchangeRateConfigured:
          usdToPkrRate > 0
      },

      snapshot: {
        month,
        generatedAt,
        generatedBy:
          "vercel-cron",
        source:
          "Makzora Owner Dashboard",
        version: 1,
        automatic: true
      }
    };

    const {
      data: savedReport,
      error: saveError
    } = await admin
      .from("owner_monthly_reports")
      .insert({
        month_start:
          monthRange.startDate,

        reporting_currency:
          settings.reporting_currency ||
          "PKR",

        free_subscribers:
          planCounts.free,

        starter_subscribers:
          planCounts.starter,

        pro_subscribers:
          planCounts.pro,

        agency_subscribers:
          planCounts.agency,

        packages_sold:
          successfulPayments.length,

        gross_revenue:
          toMoney(grossRevenuePkr),

        refunds:
          toMoney(refundsPkr),

        payment_fees:
          toMoney(paymentFeesPkr),

        investments:
          toMoney(
            monthlyInvestmentsPkr
          ),

        operating_expenses:
          toMoney(
            monthlyOperatingExpensesPkr
          ),

        api_cost:
          toMoney(monthlyApiCostPkr),

        net_profit:
          toSignedMoney(
            cashProfitPkr
          ),

        report_data: reportData,

        generated_by: null,
        generated_at: generatedAt,
        updated_at: generatedAt
      })
      .select(
        "id,month_start,generated_at"
      )
      .single();

    if (saveError) {
      /*
        A simultaneous retry may hit the unique
        month_start constraint. Treat that as an
        already-completed report, not a fatal job.
      */
      if (
        saveError.code === "23505"
      ) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason:
            "The report was already created by another invocation.",
          month
        });
      }

      throw new Error(
        `Unable to save automatic monthly report: ${saveError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      skipped: false,
      month,
      generatedAt,
      report: savedReport,
      summary: {
        packagesSold:
          successfulPayments.length,
        grossRevenuePkr:
          toMoney(grossRevenuePkr),
        investmentsPkr:
          toMoney(
            monthlyInvestmentsPkr
          ),
        operatingExpensesPkr:
          toMoney(
            monthlyOperatingExpensesPkr
          ),
        apiCostPkr:
          toMoney(monthlyApiCostPkr),
        netProfitPkr:
          toSignedMoney(
            cashProfitPkr
          )
      }
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}