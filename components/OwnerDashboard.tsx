"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";

type PlanCounts = {
  free: number;
  starter: number;
  pro: number;
  agency: number;
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

type PaymentRow = {
  id: string;
  event_name: string;
  customer_email?: string | null;
  plan?: string | null;
  currency?: string | null;
  gross_amount_minor?: number | string | null;
  occurred_at: string;
};

type OwnerDashboardData = {
  month: {
    key: string;
    start: string;
    endExclusive: string;
  };

  settings: {
    businessName: string;
    productName: string;
    reportingCurrency: string;
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
    byStatus: Record<string, number>;
    activePaidTotal: number;
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

  recentExpenses: ExpenseRow[];
  recentPayments: PaymentRow[];

  dataStatus: {
    paymentTrackingConnected: boolean;
    apiTrackingConnected: boolean;
    exchangeRateConfigured: boolean;
  };
};

type Notice = {
  type: "success" | "error";
  text: string;
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
];

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatPkr(value: unknown) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatUsd(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4
  }).format(Number(value) || 0);
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not configured";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(date);
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function percentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((value / total) * 100))
  );
}

export function OwnerDashboard({
  ownerEmail
}: {
  ownerEmail: string;
}) {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [data, setData] =
    useState<OwnerDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [savingExpense, setSavingExpense] =
    useState(false);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [creatingPdf, setCreatingPdf] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "other",
    entry_type: "expense",
    amount: "",
    currency: "PKR",
    expense_date: new Date()
      .toISOString()
      .slice(0, 10),
    recurrence: "one_time",
    vendor: "",
    notes: ""
  });

  const [settingsForm, setSettingsForm] =
    useState({
      selling_started_on: "",
      usd_to_pkr_rate: "",
      openai_budget_pkr: "",
      monthly_revenue_target_pkr: ""
    });

  const loadDashboard = useCallback(
    async (mode: "load" | "refresh" = "load") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setNotice(null);

      try {
        const response = await fetch(
          `/clientpilotai/api/owner/dashboard?month=${selectedMonth}`,
          {
            cache: "no-store"
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load Owner Dashboard."
          );
        }

        const dashboardData =
          result as OwnerDashboardData;

        setData(dashboardData);

        setSettingsForm({
          selling_started_on:
            dashboardData.settings
              .sellingStartedOn || "",
          usd_to_pkr_rate: String(
            dashboardData.settings.usdToPkrRate ||
              ""
          ),
          openai_budget_pkr: String(
            dashboardData.settings
              .openAiBudgetPkr || ""
          ),
          monthly_revenue_target_pkr: String(
            dashboardData.settings
              .monthlyRevenueTargetPkr || ""
          )
        });
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load Owner Dashboard."
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const revenueTargetPercentage = useMemo(
    () =>
      percentage(
        data?.revenue.netRevenuePkr || 0,
        data?.settings
          .monthlyRevenueTargetPkr || 0
      ),
    [data]
  );

  const apiBudgetPercentage = useMemo(
    () =>
      percentage(
        data?.apiUsage.estimatedCostPkr || 0,
        data?.apiUsage.budgetPkr || 0
      ),
    [data]
  );

  async function submitExpense(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingExpense(true);
    setNotice(null);

    try {
      const response = await fetch(
        "/clientpilotai/api/owner/dashboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "expense",
            ...expenseForm,
            amount: Number(expenseForm.amount)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to save business entry."
        );
      }

      setExpenseForm({
        title: "",
        category: "other",
        entry_type: "expense",
        amount: "",
        currency: "PKR",
        expense_date: new Date()
          .toISOString()
          .slice(0, 10),
        recurrence: "one_time",
        vendor: "",
        notes: ""
      });

      setNotice({
        type: "success",
        text:
          "Business investment or expense saved successfully."
      });

      await loadDashboard("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save business entry."
      });
    } finally {
      setSavingExpense(false);
    }
  }

  async function submitSettings(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingSettings(true);
    setNotice(null);

    try {
      const response = await fetch(
        "/clientpilotai/api/owner/dashboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "settings",
            selling_started_on:
              settingsForm.selling_started_on,
            usd_to_pkr_rate: Number(
              settingsForm.usd_to_pkr_rate
            ),
            openai_budget_pkr: Number(
              settingsForm.openai_budget_pkr
            ),
            monthly_revenue_target_pkr: Number(
              settingsForm.monthly_revenue_target_pkr
            )
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to save Owner settings."
        );
      }

      setNotice({
        type: "success",
        text:
          "Owner Dashboard settings updated successfully."
      });

      await loadDashboard("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save Owner settings."
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function downloadPdfReport() {
    if (!data) {
      return;
    }

    setCreatingPdf(true);
    setNotice(null);

    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      let y = 18;

      pdf.setFillColor(17, 17, 17);
      pdf.rect(0, 0, pageWidth, 44, "F");

      pdf.setTextColor(200, 164, 90);
      pdf.setFontSize(10);
      pdf.text(
        "MAKZORA OWNER REPORT",
        15,
        16
      );

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text("ClientPilot AI", 15, 28);

      pdf.setFontSize(10);
      pdf.text(
        formatMonth(selectedMonth),
        15,
        36
      );

      y = 56;

      pdf.setTextColor(17, 17, 17);
      pdf.setFontSize(15);
      pdf.text("Business Summary", 15, y);

      y += 10;
      pdf.setFontSize(10);

      const summaryRows = [
        [
          "Total subscribers",
          formatNumber(data.subscribers.total)
        ],
        [
          "Active paid subscribers",
          formatNumber(
            data.subscribers.activePaidTotal
          )
        ],
        [
          "Packages sold",
          formatNumber(data.sales.packagesSold)
        ],
        [
          "Gross revenue",
          formatPkr(
            data.revenue.grossRevenuePkr
          )
        ],
        [
          "Net revenue",
          formatPkr(data.revenue.netRevenuePkr)
        ],
        [
          "Monthly investments",
          formatPkr(
            data.costs.monthlyInvestmentsPkr
          )
        ],
        [
          "Operating expenses",
          formatPkr(
            data.costs
              .monthlyOperatingExpensesPkr
          )
        ],
        [
          "API cost",
          formatPkr(
            data.apiUsage.estimatedCostPkr
          )
        ],
        [
          "Cash profit",
          formatPkr(data.profit.cashProfitPkr)
        ],
        [
          "Operating profit",
          formatPkr(
            data.profit.operatingProfitPkr
          )
        ]
      ];

      for (const [label, value] of summaryRows) {
        pdf.setTextColor(105, 101, 93);
        pdf.text(label, 15, y);

        pdf.setTextColor(17, 17, 17);
        pdf.text(value, 120, y);

        pdf.setDrawColor(230, 227, 220);
        pdf.line(15, y + 3, 195, y + 3);

        y += 10;
      }

      y += 5;

      pdf.setFontSize(15);
      pdf.setTextColor(17, 17, 17);
      pdf.text("Subscriber Plans", 15, y);

      y += 10;
      pdf.setFontSize(10);

      const planRows = [
        [
          "Free",
          data.subscribers.byPlan.free
        ],
        [
          "Starter",
          data.subscribers.byPlan.starter
        ],
        [
          "Pro",
          data.subscribers.byPlan.pro
        ],
        [
          "Agency",
          data.subscribers.byPlan.agency
        ]
      ];

      for (const [plan, count] of planRows) {
        pdf.setTextColor(105, 101, 93);
        pdf.text(String(plan), 15, y);

        pdf.setTextColor(17, 17, 17);
        pdf.text(String(count), 120, y);

        y += 8;
      }

      y += 6;

      pdf.setFontSize(15);
      pdf.text("API Usage", 15, y);

      y += 10;
      pdf.setFontSize(10);

      pdf.text(
        `Requests: ${formatNumber(
          data.apiUsage.requests
        )}`,
        15,
        y
      );

      y += 8;

      pdf.text(
        `Tokens: ${formatNumber(
          data.apiUsage.totalTokens
        )}`,
        15,
        y
      );

      y += 8;

      pdf.text(
        `Estimated cost: ${formatUsd(
          data.apiUsage.estimatedCostUsd
        )} / ${formatPkr(
          data.apiUsage.estimatedCostPkr
        )}`,
        15,
        y
      );

      y += 14;

      pdf.setTextColor(120, 116, 108);
      pdf.setFontSize(8);

      pdf.text(
        `Generated for ${ownerEmail}`,
        15,
        y
      );

      pdf.text(
        `Generated ${new Date().toLocaleString()}`,
        15,
        y + 5
      );

      pdf.save(
        `Makzora-Owner-Report-${selectedMonth}.pdf`
      );

      setNotice({
        type: "success",
        text:
          "Monthly Owner Dashboard PDF generated successfully."
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to generate the PDF report."
      });
    } finally {
      setCreatingPdf(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="cp-owner-page">
        <section className="cp-owner-loading">
          <div />
          <span />
          <strong />
          <small />
        </section>
      </div>
    );
  }

  return (
    <div className="cp-owner-page">
      <section className="cp-owner-hero">
        <div className="cp-owner-hero-copy">
          <span className="cp-owner-eyebrow">
            Makzora Private Control Center
          </span>

          <h1>Owner Dashboard</h1>

          <p>
            Monitor ClientPilot AI subscriptions,
            revenue, expenses, investments, API
            usage and monthly profit from one secure
            workspace.
          </p>

          <div className="cp-owner-hero-meta">
            <span>Owner: {ownerEmail}</span>

            <span>
              Selling since:{" "}
              {formatDate(
                data?.settings.sellingStartedOn
              )}
            </span>
          </div>
        </div>

        <div className="cp-owner-hero-controls">
          <label>
            <span>Report month</span>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            onClick={() =>
              void loadDashboard("refresh")
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Data"}
          </button>

          <button
            type="button"
            className="cp-owner-pdf-button"
            onClick={() =>
              void downloadPdfReport()
            }
            disabled={creatingPdf || !data}
          >
            {creatingPdf
              ? "Creating PDF..."
              : "Download Monthly PDF"}
          </button>
        </div>
      </section>

      {notice ? (
        <div
          className={`cp-owner-notice cp-owner-notice-${notice.type}`}
        >
          <span>
            {notice.type === "success"
              ? "OK"
              : "!"}
          </span>

          <p>{notice.text}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {!data?.dataStatus.exchangeRateConfigured ? (
        <div className="cp-owner-warning">
          <strong>
            USD to PKR rate is not configured.
          </strong>

          <p>
            Add the current conversion rate in Owner
            Settings so Lemon Squeezy revenue and
            OpenAI costs can be calculated in PKR.
          </p>
        </div>
      ) : null}

      <section className="cp-owner-kpi-grid">
        <article className="cp-owner-kpi cp-owner-kpi-dark">
          <span>Net revenue</span>

          <strong>
            {formatPkr(
              data?.revenue.netRevenuePkr
            )}
          </strong>

          <small>
            {formatMonth(selectedMonth)}
          </small>
        </article>

        <article className="cp-owner-kpi">
          <span>Packages sold</span>

          <strong>
            {formatNumber(
              data?.sales.packagesSold
            )}
          </strong>

          <small>
            New and renewed payments
          </small>
        </article>

        <article className="cp-owner-kpi">
          <span>Active paid users</span>

          <strong>
            {formatNumber(
              data?.subscribers.activePaidTotal
            )}
          </strong>

          <small>
            Starter, Pro and Agency
          </small>
        </article>

        <article className="cp-owner-kpi">
          <span>Monthly expenses</span>

          <strong>
            {formatPkr(
              data?.costs
                .monthlyOperatingExpensesPkr
            )}
          </strong>

          <small>
            Excluding investments
          </small>
        </article>

        <article className="cp-owner-kpi cp-owner-kpi-gold">
          <span>Profit this month</span>

          <strong>
            {formatPkr(
              data?.profit.cashProfitPkr
            )}
          </strong>

          <small>
            Revenue minus cash outflow
          </small>
        </article>
      </section>

      <div className="cp-owner-main-grid">
        <section className="cp-owner-card cp-owner-finance-card">
          <div className="cp-owner-card-head">
            <div>
              <span>Financial performance</span>
              <h2>Revenue and profit</h2>
            </div>

            <strong>
              {formatMonth(selectedMonth)}
            </strong>
          </div>

          <div className="cp-owner-finance-list">
            <div>
              <span>Gross revenue</span>
              <strong>
                {formatPkr(
                  data?.revenue.grossRevenuePkr
                )}
              </strong>
            </div>

            <div>
              <span>Refunds</span>
              <strong>
                -{" "}
                {formatPkr(
                  data?.revenue.refundsPkr
                )}
              </strong>
            </div>

            <div>
              <span>Payment fees</span>
              <strong>
                -{" "}
                {formatPkr(
                  data?.revenue.paymentFeesPkr
                )}
              </strong>
            </div>

            <div>
              <span>Investments this month</span>
              <strong>
                -{" "}
                {formatPkr(
                  data?.costs
                    .monthlyInvestmentsPkr
                )}
              </strong>
            </div>

            <div>
              <span>Operating expenses</span>
              <strong>
                -{" "}
                {formatPkr(
                  data?.costs
                    .monthlyOperatingExpensesPkr
                )}
              </strong>
            </div>

            <div className="total">
              <span>Cash profit</span>
              <strong>
                {formatPkr(
                  data?.profit.cashProfitPkr
                )}
              </strong>
            </div>
          </div>

          <div className="cp-owner-progress-block">
            <div>
              <span>Monthly revenue target</span>
              <strong>
                {revenueTargetPercentage}%
              </strong>
            </div>

            <div className="cp-owner-progress">
              <i
                style={{
                  width: `${revenueTargetPercentage}%`
                }}
              />
            </div>

            <small>
              Target:{" "}
              {formatPkr(
                data?.settings
                  .monthlyRevenueTargetPkr
              )}
            </small>
          </div>
        </section>

        <section className="cp-owner-card">
          <div className="cp-owner-card-head">
            <div>
              <span>Subscription overview</span>
              <h2>Subscribers by plan</h2>
            </div>

            <strong>
              {formatNumber(
                data?.subscribers.total
              )}
            </strong>
          </div>

          <div className="cp-owner-plan-grid">
            {(
              [
                "free",
                "starter",
                "pro",
                "agency"
              ] as const
            ).map((plan) => (
              <article key={plan}>
                <span>{plan}</span>

                <strong>
                  {formatNumber(
                    data?.subscribers.byPlan[plan]
                  )}
                </strong>

                <small>
                  {
                    data?.sales
                      .packagesSoldByPlan[plan]
                  }{" "}
                  sold this month
                </small>
              </article>
            ))}
          </div>

          <div className="cp-owner-subscription-summary">
            <div>
              <span>Starter active</span>
              <strong>
                {
                  data?.subscribers
                    .activePaidByPlan.starter
                }
              </strong>
            </div>

            <div>
              <span>Pro active</span>
              <strong>
                {
                  data?.subscribers
                    .activePaidByPlan.pro
                }
              </strong>
            </div>

            <div>
              <span>Agency active</span>
              <strong>
                {
                  data?.subscribers
                    .activePaidByPlan.agency
                }
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div className="cp-owner-secondary-grid">
        <section className="cp-owner-card cp-owner-api-card">
          <div className="cp-owner-card-head">
            <div>
              <span>OpenAI and API control</span>
              <h2>Usage and estimated cost</h2>
            </div>

            <span
              className={`cp-owner-connection ${
                data?.dataStatus
                  .apiTrackingConnected
                  ? "connected"
                  : ""
              }`}
            >
              {data?.dataStatus
                .apiTrackingConnected
                ? "Connected"
                : "Waiting for usage"}
            </span>
          </div>

          <div className="cp-owner-api-stats">
            <article>
              <span>API requests</span>
              <strong>
                {formatNumber(
                  data?.apiUsage.requests
                )}
              </strong>
            </article>

            <article>
              <span>Total tokens</span>
              <strong>
                {formatNumber(
                  data?.apiUsage.totalTokens
                )}
              </strong>
            </article>

            <article>
              <span>Audio processed</span>
              <strong>
                {formatNumber(
                  (data?.apiUsage.audioSeconds ||
                    0) / 60
                )}{" "}
                min
              </strong>
            </article>

            <article>
              <span>Estimated API cost</span>
              <strong>
                {formatPkr(
                  data?.apiUsage
                    .estimatedCostPkr
                )}
              </strong>

              <small>
                {formatUsd(
                  data?.apiUsage
                    .estimatedCostUsd
                )}
              </small>
            </article>
          </div>

          <div className="cp-owner-progress-block">
            <div>
              <span>OpenAI budget used</span>
              <strong>
                {apiBudgetPercentage}%
              </strong>
            </div>

            <div className="cp-owner-progress">
              <i
                style={{
                  width: `${apiBudgetPercentage}%`
                }}
              />
            </div>

            <small>
              Remaining:{" "}
              {formatPkr(
                data?.apiUsage
                  .remainingBudgetPkr
              )}
            </small>
          </div>
        </section>

        <section className="cp-owner-card">
          <div className="cp-owner-card-head">
            <div>
              <span>Business investment</span>
              <h2>Lifetime investment</h2>
            </div>

            <strong>
              {formatPkr(
                data?.costs.lifetimeInvestmentPkr
              )}
            </strong>
          </div>

          <div className="cp-owner-investment-highlight">
            <span>Total invested</span>

            <strong>
              {formatPkr(
                data?.costs.lifetimeInvestmentPkr
              )}
            </strong>

            <p>
              Includes domain, API credits,
              development, software and other
              investment entries.
            </p>
          </div>

          <div className="cp-owner-mini-finance">
            <div>
              <span>This month invested</span>
              <strong>
                {formatPkr(
                  data?.costs
                    .monthlyInvestmentsPkr
                )}
              </strong>
            </div>

            <div>
              <span>Monthly cash outflow</span>
              <strong>
                {formatPkr(
                  data?.costs
                    .totalMonthlyCashOutflowPkr
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div className="cp-owner-form-grid">
        <section className="cp-owner-card">
          <div className="cp-owner-card-head">
            <div>
              <span>Business ledger</span>
              <h2>Add investment or expense</h2>
            </div>
          </div>

          <form
            className="cp-owner-form"
            onSubmit={submitExpense}
          >
            <label>
              <span>Title</span>

              <input
                value={expenseForm.title}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
                placeholder="Example: Marketing campaign"
                required
              />
            </label>

            <div className="cp-owner-form-columns">
              <label>
                <span>Entry type</span>

                <select
                  value={expenseForm.entry_type}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      entry_type:
                        event.target.value
                    }))
                  }
                >
                  <option value="expense">
                    Expense
                  </option>

                  <option value="investment">
                    Investment
                  </option>
                </select>
              </label>

              <label>
                <span>Category</span>

                <select
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category:
                        event.target.value
                    }))
                  }
                >
                  {EXPENSE_CATEGORIES.map(
                    (category) => (
                      <option
                        value={category}
                        key={category}
                      >
                        {category.replaceAll(
                          "_",
                          " "
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="cp-owner-form-columns">
              <label>
                <span>Amount</span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value
                    }))
                  }
                  required
                />
              </label>

              <label>
                <span>Currency</span>

                <select
                  value={expenseForm.currency}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      currency:
                        event.target.value
                    }))
                  }
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="cp-owner-form-columns">
              <label>
                <span>Payment date</span>

                <input
                  type="date"
                  value={
                    expenseForm.expense_date
                  }
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      expense_date:
                        event.target.value
                    }))
                  }
                  required
                />
              </label>

              <label>
                <span>Recurrence</span>

                <select
                  value={expenseForm.recurrence}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      recurrence:
                        event.target.value
                    }))
                  }
                >
                  <option value="one_time">
                    One time
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>

                  <option value="quarterly">
                    Quarterly
                  </option>

                  <option value="annual">
                    Annual
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>Vendor</span>

              <input
                value={expenseForm.vendor}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    vendor: event.target.value
                  }))
                }
                placeholder="Optional"
              />
            </label>

            <label>
              <span>Notes</span>

              <textarea
                value={expenseForm.notes}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
                placeholder="Optional details"
              />
            </label>

            <button
              type="submit"
              disabled={savingExpense}
            >
              {savingExpense
                ? "Saving..."
                : "Add to Business Ledger"}
            </button>
          </form>
        </section>

        <section className="cp-owner-card">
          <div className="cp-owner-card-head">
            <div>
              <span>Owner configuration</span>
              <h2>Business settings</h2>
            </div>
          </div>

          <form
            className="cp-owner-form"
            onSubmit={submitSettings}
          >
            <label>
              <span>Start selling date</span>

              <input
                type="date"
                value={
                  settingsForm.selling_started_on
                }
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    selling_started_on:
                      event.target.value
                  }))
                }
              />
            </label>

            <label>
              <span>USD to PKR rate</span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  settingsForm.usd_to_pkr_rate
                }
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    usd_to_pkr_rate:
                      event.target.value
                  }))
                }
                placeholder="Example: 280"
              />
            </label>

            <label>
              <span>Monthly OpenAI budget PKR</span>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  settingsForm.openai_budget_pkr
                }
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    openai_budget_pkr:
                      event.target.value
                  }))
                }
              />
            </label>

            <label>
              <span>
                Monthly revenue target PKR
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  settingsForm
                    .monthly_revenue_target_pkr
                }
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    monthly_revenue_target_pkr:
                      event.target.value
                  }))
                }
              />
            </label>

            <button
              type="submit"
              disabled={savingSettings}
            >
              {savingSettings
                ? "Saving Settings..."
                : "Save Owner Settings"}
            </button>
          </form>

          <div className="cp-owner-settings-note">
            <strong>Private owner access</strong>

            <p>
              Financial information is available
              only to email addresses configured in
              the secure OWNER_EMAILS environment
              variable.
            </p>
          </div>
        </section>
      </div>

      <section className="cp-owner-card cp-owner-ledger">
        <div className="cp-owner-card-head">
          <div>
            <span>Recent activity</span>
            <h2>Investments and expenses</h2>
          </div>

          <strong>
            {data?.recentExpenses.length || 0} entries
          </strong>
        </div>

        {!data?.recentExpenses.length ? (
          <div className="cp-owner-empty">
            No ledger entries found.
          </div>
        ) : (
          <div className="cp-owner-table-wrap">
            <table className="cp-owner-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {data.recentExpenses.map(
                  (expense) => (
                    <tr key={expense.id}>
                      <td>
                        <strong>
                          {expense.title}
                        </strong>

                        <small>
                          {expense.vendor ||
                            expense.recurrence}
                        </small>
                      </td>

                      <td>
                        <span
                          className={`cp-owner-type cp-owner-type-${expense.entry_type}`}
                        >
                          {expense.entry_type}
                        </span>
                      </td>

                      <td>
                        {expense.category.replaceAll(
                          "_",
                          " "
                        )}
                      </td>

                      <td>
                        {formatDate(
                          expense.expense_date
                        )}
                      </td>

                      <td>
                        <strong>
                          {expense.currency === "PKR"
                            ? formatPkr(
                                expense.amount
                              )
                            : formatUsd(
                                expense.amount
                              )}
                        </strong>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}