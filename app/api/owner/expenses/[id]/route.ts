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

const ENTRY_TYPES = [
  "investment",
  "expense"
] as const;

const RECURRENCE_OPTIONS = [
  "one_time",
  "monthly",
  "quarterly",
  "annual"
] as const;

const CURRENCIES = [
  "PKR",
  "USD"
] as const;

type ExpenseCategory =
  (typeof EXPENSE_CATEGORIES)[number];

type EntryType =
  (typeof ENTRY_TYPES)[number];

type Recurrence =
  (typeof RECURRENCE_OPTIONS)[number];

type Currency =
  (typeof CURRENCIES)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getText(
  value: unknown
) {
  return String(value ?? "").trim();
}

function getNullableText(
  value: unknown
) {
  const text = getText(value);

  return text || null;
}

function isAllowedValue<T extends string>(
  value: string,
  allowed: readonly T[]
): value is T {
  return allowed.includes(value as T);
}

function getDateValue(
  value: unknown
) {
  const dateText = getText(value);

  if (!dateText) {
    return null;
  }

  const date = new Date(
    `${dateText}T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Please enter a valid expense date."
    );
  }

  return dateText;
}

function getAmountValue(
  value: unknown
) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Amount must be greater than zero."
    );
  }

  return amount;
}

function createErrorResponse(
  error: unknown
) {
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
      : "Unable to update the Owner business ledger.";

  console.error(
    "Owner expense API error:",
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    await requireOwnerUser();

    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        {
          error:
            "Invalid business ledger entry."
        },
        {
          status: 400
        }
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const title = getText(body.title);

    if (!title) {
      return NextResponse.json(
        {
          error: "Title is required."
        },
        {
          status: 400
        }
      );
    }

    const category =
      getText(body.category);

    if (
      !isAllowedValue<ExpenseCategory>(
        category,
        EXPENSE_CATEGORIES
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid category."
        },
        {
          status: 400
        }
      );
    }

    const entryType =
      getText(body.entry_type);

    if (
      !isAllowedValue<EntryType>(
        entryType,
        ENTRY_TYPES
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid entry type."
        },
        {
          status: 400
        }
      );
    }

    const recurrence =
      getText(body.recurrence);

    if (
      !isAllowedValue<Recurrence>(
        recurrence,
        RECURRENCE_OPTIONS
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid recurrence."
        },
        {
          status: 400
        }
      );
    }

    const currency =
      getText(body.currency).toUpperCase();

    if (
      !isAllowedValue<Currency>(
        currency,
        CURRENCIES
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Currency must be PKR or USD."
        },
        {
          status: 400
        }
      );
    }

    const amount =
      getAmountValue(body.amount);

    const expenseDate =
      getDateValue(body.expense_date);

    if (!expenseDate) {
      return NextResponse.json(
        {
          error:
            "Expense date is required."
        },
        {
          status: 400
        }
      );
    }

    const admin =
      createSupabaseAdminClient();

    const {
      data,
      error
    } = await admin
      .from("owner_expenses")
      .update({
        title,
        category,
        entry_type: entryType,
        amount,
        currency,
        expense_date: expenseDate,
        recurrence,
        vendor:
          getNullableText(body.vendor),
        notes:
          getNullableText(body.notes)
      })
      .eq("id", id)
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
      .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to update entry: ${error.message}`
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Business ledger entry was not found."
        },
        {
          status: 404
        }
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

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    await requireOwnerUser();

    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        {
          error:
            "Invalid business ledger entry."
        },
        {
          status: 400
        }
      );
    }

    const admin =
      createSupabaseAdminClient();

    const {
      data,
      error
    } = await admin
      .from("owner_expenses")
      .delete()
      .eq("id", id)
      .select("id,title")
      .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to delete entry: ${error.message}`
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Business ledger entry was not found."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({
      success: true,
      deletedExpense: data
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}