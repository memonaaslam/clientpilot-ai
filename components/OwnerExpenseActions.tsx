"use client";

import {
  useEffect,
  useState,
  type FormEvent
} from "react";

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
};

type ExpenseForm = {
  title: string;
  category: string;
  entry_type: "investment" | "expense";
  amount: string;
  currency: string;
  expense_date: string;
  recurrence: string;
  vendor: string;
  notes: string;
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

function toDateInputValue(
  value: string
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function createForm(
  expense: ExpenseRow
): ExpenseForm {
  return {
    title: expense.title,
    category: expense.category,
    entry_type: expense.entry_type,
    amount: String(expense.amount),
    currency: expense.currency,
    expense_date: toDateInputValue(
      expense.expense_date
    ),
    recurrence: expense.recurrence,
    vendor: expense.vendor || "",
    notes: expense.notes || ""
  };
}

export function OwnerExpenseActions({
  expense,
  onChanged
}: {
  expense: ExpenseRow;
  onChanged: () => void | Promise<void>;
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState<ExpenseForm>(
      createForm(expense)
    );

  useEffect(() => {
    if (!isEditing) {
      setForm(createForm(expense));
    }
  }, [expense, isEditing]);

  function closeEditor() {
    if (isSaving) {
      return;
    }

    setError("");
    setForm(createForm(expense));
    setIsEditing(false);
  }

  async function saveExpense(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/expenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount)
          })
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update this entry."
        );
      }

      setIsEditing(false);
      await onChanged();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update this entry."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteExpense() {
    const confirmed =
      window.confirm(
        `Delete "${expense.title}" permanently? This will immediately recalculate investments, expenses and profit.`
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/expenses/${expense.id}`,
        {
          method: "DELETE"
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete this entry."
        );
      }

      setIsEditing(false);
      await onChanged();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete this entry."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="cp-owner-row-actions">
        <button
          type="button"
          onClick={() => {
            setError("");
            setIsEditing(true);
          }}
        >
          Edit
        </button>

        <button
          type="button"
          className="danger"
          onClick={() =>
            void deleteExpense()
          }
          disabled={isDeleting}
        >
          {isDeleting
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>

      {error && !isEditing ? (
        <small className="cp-owner-row-error">
          {error}
        </small>
      ) : null}

      {isEditing ? (
        <div
          className="cp-owner-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <section
            className="cp-owner-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit business ledger entry"
          >
            <div className="cp-owner-modal-head">
              <div>
                <span>
                  Business ledger
                </span>

                <h3>Edit entry</h3>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <form
              className="cp-owner-form"
              onSubmit={saveExpense}
            >
              <label>
                <span>Title</span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title:
                        event.target.value
                    }))
                  }
                  required
                />
              </label>

              <div className="cp-owner-form-columns">
                <label>
                  <span>Entry type</span>

                  <select
                    value={
                      form.entry_type
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          entry_type:
                            event.target
                              .value as
                              | "investment"
                              | "expense"
                        })
                      )
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
                    value={form.category}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          category:
                            event.target
                              .value
                        })
                      )
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
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          amount:
                            event.target
                              .value
                        })
                      )
                    }
                    required
                  />
                </label>

                <label>
                  <span>Currency</span>

                  <select
                    value={form.currency}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          currency:
                            event.target
                              .value
                        })
                      )
                    }
                  >
                    <option value="PKR">
                      PKR
                    </option>

                    <option value="USD">
                      USD
                    </option>
                  </select>
                </label>
              </div>

              <div className="cp-owner-form-columns">
                <label>
                  <span>Date</span>

                  <input
                    type="date"
                    value={
                      form.expense_date
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          expense_date:
                            event.target
                              .value
                        })
                      )
                    }
                    required
                  />
                </label>

                <label>
                  <span>Recurrence</span>

                  <select
                    value={
                      form.recurrence
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          recurrence:
                            event.target
                              .value
                        })
                      )
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
                  value={form.vendor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vendor:
                        event.target.value
                    }))
                  }
                />
              </label>

              <label>
                <span>Notes</span>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes:
                        event.target.value
                    }))
                  }
                />
              </label>

              {error ? (
                <div className="cp-owner-modal-error">
                  {error}
                </div>
              ) : null}

              <div className="cp-owner-modal-actions">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}