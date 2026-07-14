import type {
  PlanId
} from "@/lib/plans";

type PaidPlan =
  Exclude<PlanId, "free">;

type VariantEntry = {
  plan: PaidPlan;
  variantId: string;
};

function cleanVariantId(
  value: unknown
) {
  return String(value ?? "").trim();
}

function getVariantEntries():
  VariantEntry[] {
  const entries: VariantEntry[] = [
    {
      plan: "starter",
      variantId: cleanVariantId(
        process.env
          .LEMON_STARTER_VARIANT_ID
      )
    },
    {
      plan: "pro",
      variantId: cleanVariantId(
        process.env
          .LEMON_PRO_VARIANT_ID
      )
    },
    {
      plan: "agency",
      variantId: cleanVariantId(
        process.env
          .LEMON_AGENCY_VARIANT_ID
      )
    }
  ];

  return entries.filter(
    (entry) =>
      Boolean(entry.variantId)
  );
}

export function getPlanFromLemonVariantId(
  value: unknown
): PaidPlan | null {
  const variantId =
    cleanVariantId(value);

  if (!variantId) {
    return null;
  }

  const matches =
    getVariantEntries().filter(
      (entry) =>
        entry.variantId === variantId
    );

  /*
    Reject missing, unknown, or accidentally
    duplicated variant mappings.
  */
  if (matches.length !== 1) {
    return null;
  }

  return matches[0].plan;
}

export function getConfiguredLemonVariantIds() {
  return Object.fromEntries(
    getVariantEntries().map(
      (entry) => [
        entry.plan,
        entry.variantId
      ]
    )
  ) as Partial<
    Record<PaidPlan, string>
  >;
}
