import { NextResponse } from "next/server";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

import {
  createSupabaseAdminClient
} from "@/lib/sales-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanCounts = {
  free?: unknown;
  starter?: unknown;
  pro?: unknown;
  agency?: unknown;
};

type DashboardSnapshot = {
  month?: {
    key?: unknown;
    start?: unknown;
    endExclusive?: unknown;
  };

  settings?: {
    reportingCurrency?: unknown;
    businessName?: unknown;
    productName?: unknown;
    supportEmail?: unknown;
    sellingStartedOn?: unknown;
    usdToPkrRate?: unknown;
    openAiBudgetPkr?: unknown;
    monthlyRevenueTargetPkr?: unknown;
  };

  subscribers?: {
    total?: unknown;
    byPlan?: PlanCounts;
    activePaidByPlan?: PlanCounts;
    activePaidTotal?: unknown;
    byStatus?: Record<string, unknown>;
  };

  sales?: {
    packagesSold?: unknown;
    packagesSoldByPlan?: PlanCounts;
  };

  revenue?: {
    grossRevenuePkr?: unknown;
    refundsPkr?: unknown;
    paymentFeesPkr?: unknown;
    taxesPkr?: unknown;
    netRevenuePkr?: unknown;
    revenueByCurrency?: Record<string, unknown>;
  };

  costs?: {
    monthlyInvestmentsPkr?: unknown;
    monthlyOperatingExpensesPkr?: unknown;
    lifetimeInvestmentPkr?: unknown;
    monthlyApiCostUsd?: unknown;
    monthlyApiCostPkr?: unknown;
    totalMonthlyCashOutflowPkr?: unknown;
  };

  profit?: {
    cashProfitPkr?: unknown;
    operatingProfitPkr?: unknown;
  };

  apiUsage?: {
    requests?: unknown;
    inputTokens?: unknown;
    outputTokens?: unknown;
    totalTokens?: unknown;
    audioSeconds?: unknown;
    estimatedCostUsd?: unknown;
    estimatedCostPkr?: unknown;
    budgetPkr?: unknown;
    remainingBudgetPkr?: unknown;
  };

  dataStatus?: {
    paymentTrackingConnected?: unknown;
    apiTrackingConnected?: unknown;
    exchangeRateConfigured?: unknown;
  };

  recentExpenses?: unknown[];
  recentPayments?: unknown[];
  recentApiUsage?: unknown[];
};

type MonthlyReportRow = {
  id: string;
  month_start: string;
  reporting_currency: string;
  free_subscribers: number | string;
  starter_subscribers: number | string;
  pro_subscribers: number | string;
  agency_subscribers: number | string;
  packages_sold: number | string;
  gross_revenue: number | string;
  refunds: number | string;
  payment_fees: number | string;
  investments: number | string;
  operating_expenses: number | string;
  api_cost: number | string;
  net_profit: number | string;
  report_data: Record<string, unknown>;
  generated_by?: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

function toNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function toCount(value: unknown) {
  return Math.max(
    0,
    Math.round(toNumber(value))
  );
}

function toMoney(value: unknown) {
  return Number(
    Math.max(0, toNumber(value)).toFixed(2)
  );
}

function toSignedMoney(value: unknown) {
  return Number(toNumber(value).toFixed(2));
}

function getText(
  value: unknown,
  fallback = ""
) {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function isValidMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getMonthStart(month: string) {
  return `${month}-01`;
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
      : "Unable to process monthly report.";

  console.error(
    "Owner monthly report API error:",
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

export async function GET() {
  try {
    await requireOwnerUser();

    const admin =
      createSupabaseAdminClient();

    const {
      data,
      error
    } = await admin
      .from("owner_monthly_reports")
      .select(
        [
          "id",
          "month_start",
          "reporting_currency",
          "free_subscribers",
          "starter_subscribers",
          "pro_subscribers",
          "agency_subscribers",
          "packages_sold",
          "gross_revenue",
          "refunds",
          "payment_fees",
          "investments",
          "operating_expenses",
          "api_cost",
          "net_profit",
          "report_data",
          "generated_by",
          "generated_at",
          "created_at",
          "updated_at"
        ].join(",")
      )
      .order("month_start", {
        ascending: false
      });

    if (error) {
      throw new Error(
        `Unable to load monthly reports: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
      reports:
        (data || []) as unknown as MonthlyReportRow[]
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(
  request: Request
) {
  try {
    const owner =
      await requireOwnerUser();

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const month = getText(body.month);

    if (!isValidMonth(month)) {
      return NextResponse.json(
        {
          error:
            "Report month must use YYYY-MM format."
        },
        {
          status: 400
        }
      );
    }

    const replaceExisting =
      body.replaceExisting === true;

    const reportData =
      (body.reportData || null) as
        | DashboardSnapshot
        | null;

    if (
      !reportData ||
      typeof reportData !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Current Owner Dashboard data is required."
        },
        {
          status: 400
        }
      );
    }

    const reportMonth =
      getText(reportData.month?.key);

    if (
      reportMonth &&
      reportMonth !== month
    ) {
      return NextResponse.json(
        {
          error:
            "The selected report month does not match the dashboard data."
        },
        {
          status: 400
        }
      );
    }

    const admin =
      createSupabaseAdminClient();

    const monthStart =
      getMonthStart(month);

    const {
      data: existingReport,
      error: existingError
    } = await admin
      .from("owner_monthly_reports")
      .select("id,month_start,generated_at")
      .eq("month_start", monthStart)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Unable to check existing report: ${existingError.message}`
      );
    }

    if (
      existingReport &&
      !replaceExisting
    ) {
      return NextResponse.json(
        {
          error:
            "A saved report already exists for this month.",
          code: "REPORT_EXISTS",
          existingReport
        },
        {
          status: 409
        }
      );
    }

    const planCounts =
      reportData.subscribers?.byPlan || {};

    const generatedAt =
      new Date().toISOString();

    const storedReportData = {
      ...reportData,
      snapshot: {
        month,
        generatedAt,
        generatedBy:
          owner.email || owner.id,
        source:
          "Makzora Owner Dashboard",
        version: 1
      }
    };

    const payload = {
      month_start: monthStart,
      reporting_currency:
        getText(
          reportData.settings
            ?.reportingCurrency,
          "PKR"
        ).toUpperCase(),

      free_subscribers:
        toCount(planCounts.free),

      starter_subscribers:
        toCount(planCounts.starter),

      pro_subscribers:
        toCount(planCounts.pro),

      agency_subscribers:
        toCount(planCounts.agency),

      packages_sold:
        toCount(
          reportData.sales?.packagesSold
        ),

      gross_revenue:
        toMoney(
          reportData.revenue
            ?.grossRevenuePkr
        ),

      refunds:
        toMoney(
          reportData.revenue?.refundsPkr
        ),

      payment_fees:
        toMoney(
          reportData.revenue
            ?.paymentFeesPkr
        ),

      investments:
        toMoney(
          reportData.costs
            ?.monthlyInvestmentsPkr
        ),

      operating_expenses:
        toMoney(
          reportData.costs
            ?.monthlyOperatingExpensesPkr
        ),

      api_cost:
        toMoney(
          reportData.costs
            ?.monthlyApiCostPkr
        ),

      net_profit:
        toSignedMoney(
          reportData.profit
            ?.cashProfitPkr
        ),

      report_data:
        storedReportData,

      generated_by: owner.id,
      generated_at: generatedAt,
      updated_at: generatedAt
    };

    let savedReport:
      | MonthlyReportRow
      | null = null;

    if (existingReport) {
      const {
        data,
        error
      } = await admin
        .from("owner_monthly_reports")
        .update(payload)
        .eq("id", existingReport.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Unable to regenerate monthly report: ${error.message}`
        );
      }

      savedReport =
        data as unknown as MonthlyReportRow;
    } else {
      const {
        data,
        error
      } = await admin
        .from("owner_monthly_reports")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Unable to save monthly report: ${error.message}`
        );
      }

      savedReport =
        data as unknown as MonthlyReportRow;
    }

    return NextResponse.json({
      success: true,
      replaced:
        Boolean(existingReport),
      report: savedReport
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}