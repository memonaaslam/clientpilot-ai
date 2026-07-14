"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

type PlanCounts = {
  free: number;
  starter: number;
  pro: number;
  agency: number;
};

type DashboardSnapshot = {
  month: {
    key: string;
    start: string;
    endExclusive: string;
  };

  settings: {
    reportingCurrency: string;
    businessName: string;
    productName: string;
    supportEmail: string;
    sellingStartedOn?: string | null;
    usdToPkrRate: number;
    openAiBudgetPkr: number;
    monthlyRevenueTargetPkr: number;
  };

  subscribers: {
    total: number;
    byPlan: PlanCounts;
    activePaidByPlan: PlanCounts;
    activePaidTotal: number;
    byStatus: Record<string, number>;
  };

  sales: {
    packagesSold: number;
    packagesSoldByPlan: PlanCounts;
  };

  revenue: {
    grossRevenuePkr: number;
    refundsPkr: number;
    paymentFeesPkr: number;
    taxesPkr: number;
    netRevenuePkr: number;
    revenueByCurrency: Record<string, number>;
  };

  costs: {
    monthlyInvestmentsPkr: number;
    monthlyOperatingExpensesPkr: number;
    lifetimeInvestmentPkr: number;
    monthlyApiCostUsd: number;
    monthlyApiCostPkr: number;
    totalMonthlyCashOutflowPkr: number;
  };

  profit: {
    cashProfitPkr: number;
    operatingProfitPkr: number;
  };

  apiUsage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    audioSeconds: number;
    estimatedCostUsd: number;
    estimatedCostPkr: number;
    budgetPkr: number;
    remainingBudgetPkr: number;
  };

  dataStatus: {
    paymentTrackingConnected: boolean;
    apiTrackingConnected: boolean;
    exchangeRateConfigured: boolean;
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
  report_data: DashboardSnapshot & {
    snapshot?: {
      month?: string;
      generatedAt?: string;
      generatedBy?: string;
      source?: string;
      version?: number;
    };
  };
  generated_at: string;
  created_at: string;
  updated_at: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

function formatPkr(value: unknown) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatMonthFromStart(
  monthStart: string
) {
  const date = new Date(
    `${monthStart}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return monthStart;
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function monthStartFromKey(
  month: string
) {
  return `${month}-01`;
}

export function OwnerMonthlyReports({
  selectedMonth,
  currentData,
  ownerEmail
}: {
  selectedMonth: string;
  currentData: DashboardSnapshot | null;
  ownerEmail: string;
}) {
  const [reports, setReports] =
    useState<MonthlyReportRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const loadReports = useCallback(
    async () => {
      setLoading(true);

      try {
        const response = await fetch(
          "/clientpilotai/api/owner/reports",
          {
            cache: "no-store"
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load monthly reports."
          );
        }

        setReports(
          Array.isArray(result.reports)
            ? result.reports
            : []
        );
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load monthly reports."
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const currentSavedReport = useMemo(
    () =>
      reports.find(
        (report) =>
          report.month_start ===
          monthStartFromKey(
            selectedMonth
          )
      ) || null,
    [reports, selectedMonth]
  );

  async function saveReport(
    replaceExisting: boolean
  ) {
    if (!currentData) {
      setNotice({
        type: "error",
        text:
          "Owner Dashboard data has not loaded yet."
      });

      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(
        "/clientpilotai/api/owner/reports",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            month: selectedMonth,
            reportData: currentData,
            replaceExisting
          })
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          result.code ===
            "REPORT_EXISTS"
        ) {
          setNotice({
            type: "error",
            text:
              "This month is already saved. Use Regenerate Report to replace it with the current dashboard numbers."
          });

          return;
        }

        throw new Error(
          result.error ||
            "Unable to save monthly report."
        );
      }

      setNotice({
        type: "success",
        text: replaceExisting
          ? "Monthly report regenerated successfully."
          : "Monthly report saved successfully."
      });

      await loadReports();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save monthly report."
      });
    } finally {
      setSaving(false);
    }
  }

  async function downloadReport(
    report: MonthlyReportRow
  ) {
    setDownloadingId(report.id);
    setNotice(null);

    try {
      const { jsPDF } =
        await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const data =
        report.report_data;

      let y = 18;

      pdf.setFillColor(17, 17, 17);
      pdf.rect(
        0,
        0,
        pageWidth,
        45,
        "F"
      );

      pdf.setTextColor(200, 164, 90);
      pdf.setFontSize(10);
      pdf.text(
        "MAKZORA MONTHLY SNAPSHOT",
        15,
        16
      );

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text(
        data.settings?.productName ||
          "ClientPilot AI",
        15,
        28
      );

      pdf.setFontSize(10);
      pdf.text(
        formatMonthFromStart(
          report.month_start
        ),
        15,
        37
      );

      y = 57;

      pdf.setTextColor(17, 17, 17);
      pdf.setFontSize(15);
      pdf.text(
        "Business Summary",
        15,
        y
      );

      y += 10;
      pdf.setFontSize(10);

      const rows = [
        [
          "Total subscribers",
          formatNumber(
            data.subscribers?.total
          )
        ],
        [
          "Active paid subscribers",
          formatNumber(
            data.subscribers
              ?.activePaidTotal
          )
        ],
        [
          "Packages sold",
          formatNumber(
            data.sales?.packagesSold
          )
        ],
        [
          "Gross revenue",
          formatPkr(
            data.revenue
              ?.grossRevenuePkr
          )
        ],
        [
          "Net revenue",
          formatPkr(
            data.revenue
              ?.netRevenuePkr
          )
        ],
        [
          "Investments",
          formatPkr(
            data.costs
              ?.monthlyInvestmentsPkr
          )
        ],
        [
          "Operating expenses",
          formatPkr(
            data.costs
              ?.monthlyOperatingExpensesPkr
          )
        ],
        [
          "API cost",
          formatPkr(
            data.costs
              ?.monthlyApiCostPkr
          )
        ],
        [
          "Cash profit",
          formatPkr(
            data.profit
              ?.cashProfitPkr
          )
        ],
        [
          "Operating profit",
          formatPkr(
            data.profit
              ?.operatingProfitPkr
          )
        ]
      ];

      for (const [label, value] of rows) {
        pdf.setTextColor(
          105,
          101,
          93
        );

        pdf.text(label, 15, y);

        pdf.setTextColor(
          17,
          17,
          17
        );

        pdf.text(value, 118, y);

        pdf.setDrawColor(
          230,
          227,
          220
        );

        pdf.line(
          15,
          y + 3,
          195,
          y + 3
        );

        y += 10;
      }

      y += 6;

      pdf.setFontSize(15);
      pdf.text(
        "Subscriber Plans",
        15,
        y
      );

      y += 10;
      pdf.setFontSize(10);

      const planRows = [
        [
          "Free",
          data.subscribers?.byPlan
            ?.free || 0
        ],
        [
          "Starter",
          data.subscribers?.byPlan
            ?.starter || 0
        ],
        [
          "Pro",
          data.subscribers?.byPlan
            ?.pro || 0
        ],
        [
          "Agency",
          data.subscribers?.byPlan
            ?.agency || 0
        ]
      ];

      for (const [plan, count] of planRows) {
        pdf.setTextColor(
          105,
          101,
          93
        );

        pdf.text(
          String(plan),
          15,
          y
        );

        pdf.setTextColor(
          17,
          17,
          17
        );

        pdf.text(
          String(count),
          118,
          y
        );

        y += 8;
      }

      y += 6;

      pdf.setFontSize(15);
      pdf.text(
        "API Usage",
        15,
        y
      );

      y += 10;
      pdf.setFontSize(10);

      pdf.text(
        `Requests: ${formatNumber(
          data.apiUsage?.requests
        )}`,
        15,
        y
      );

      y += 8;

      pdf.text(
        `Tokens: ${formatNumber(
          data.apiUsage?.totalTokens
        )}`,
        15,
        y
      );

      y += 8;

      pdf.text(
        `Estimated cost: ${formatPkr(
          data.apiUsage
            ?.estimatedCostPkr
        )}`,
        15,
        y
      );

      y += 14;

      pdf.setTextColor(
        120,
        116,
        108
      );

      pdf.setFontSize(8);

      pdf.text(
        `Saved ${formatDateTime(
          report.generated_at
        )}`,
        15,
        y
      );

      pdf.text(
        `Generated for ${ownerEmail}`,
        15,
        y + 5
      );

      pdf.save(
        `Makzora-Monthly-Report-${report.month_start.slice(
          0,
          7
        )}.pdf`
      );

      setNotice({
        type: "success",
        text:
          "Saved monthly report downloaded successfully."
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to download this report."
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="cp-owner-card cp-owner-reports">
      <div className="cp-owner-card-head">
        <div>
          <span>
            Permanent monthly archive
          </span>

          <h2>Saved monthly reports</h2>
        </div>

        <div className="cp-owner-report-actions">
          {currentSavedReport ? (
            <button
              type="button"
              onClick={() =>
                void saveReport(true)
              }
              disabled={
                saving ||
                !currentData
              }
            >
              {saving
                ? "Regenerating..."
                : "Regenerate Report"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void saveReport(false)
              }
              disabled={
                saving ||
                !currentData
              }
            >
              {saving
                ? "Saving..."
                : "Save Monthly Report"}
            </button>
          )}
        </div>
      </div>

      <div className="cp-owner-report-current">
        <div>
          <span>Selected month</span>

          <strong>
            {formatMonthFromStart(
              monthStartFromKey(
                selectedMonth
              )
            )}
          </strong>
        </div>

        <div>
          <span>Snapshot status</span>

          <strong>
            {currentSavedReport
              ? "Saved"
              : "Not saved"}
          </strong>
        </div>

        <div>
          <span>
            Last generated
          </span>

          <strong>
            {currentSavedReport
              ? formatDateTime(
                  currentSavedReport
                    .generated_at
                )
              : "—"}
          </strong>
        </div>
      </div>

      {notice ? (
        <div
          className={`cp-owner-report-notice cp-owner-report-notice-${notice.type}`}
        >
          <p>{notice.text}</p>

          <button
            type="button"
            onClick={() =>
              setNotice(null)
            }
          >
            ×
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="cp-owner-report-empty">
          Loading saved reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="cp-owner-report-empty">
          No monthly snapshots have been
          saved yet.
        </div>
      ) : (
        <div className="cp-owner-report-grid">
          {reports.map((report) => (
            <article
              key={report.id}
              className="cp-owner-report-card"
            >
              <div className="cp-owner-report-card-top">
                <div>
                  <span>
                    Monthly snapshot
                  </span>

                  <h3>
                    {formatMonthFromStart(
                      report.month_start
                    )}
                  </h3>
                </div>

                <i>Saved</i>
              </div>

              <div className="cp-owner-report-metrics">
                <div>
                  <span>Revenue</span>

                  <strong>
                    {formatPkr(
                      report.gross_revenue
                    )}
                  </strong>
                </div>

                <div>
                  <span>Packages</span>

                  <strong>
                    {formatNumber(
                      report.packages_sold
                    )}
                  </strong>
                </div>

                <div>
                  <span>Expenses</span>

                  <strong>
                    {formatPkr(
                      Number(
                        report.operating_expenses
                      ) +
                        Number(
                          report.api_cost
                        )
                    )}
                  </strong>
                </div>

                <div>
                  <span>Profit</span>

                  <strong>
                    {formatPkr(
                      report.net_profit
                    )}
                  </strong>
                </div>
              </div>

              <div className="cp-owner-report-card-bottom">
                <small>
                  Generated{" "}
                  {formatDateTime(
                    report.generated_at
                  )}
                </small>

                <button
                  type="button"
                  onClick={() =>
                    void downloadReport(
                      report
                    )
                  }
                  disabled={
                    downloadingId ===
                    report.id
                  }
                >
                  {downloadingId ===
                  report.id
                    ? "Creating PDF..."
                    : "Download PDF"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}