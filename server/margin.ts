/** Pure job-margin math — the rules a shop owner can trust. */

export type CostCategory = "labor" | "materials" | "subcontract" | "other";

export type EstimateLineInput = {
  category: CostCategory;
  quantity: number;
  unitCost: number;
  unitPrice: number;
};

export type TimeEntryInput = {
  hours: number;
  costRate: number;
};

export type CostEntryInput = {
  category: CostCategory;
  amount: number;
  /** committed = PO / promised spend; actual = billed or paid */
  status: "committed" | "actual";
};

export type ChangeOrderInput = {
  costDelta: number;
  priceDelta: number;
};

export type CategoryTotals = Record<
  CostCategory,
  { budgetCost: number; budgetPrice: number; actual: number; committed: number }
>;

export type JobMargin = {
  byCategory: CategoryTotals;
  estimateCost: number;
  estimatePrice: number;
  changeCost: number;
  changePrice: number;
  budgetCost: number;
  budgetPrice: number;
  actualLabor: number;
  actualOther: number;
  committed: number;
  /** actual labor + actual non-labor + still-open commitments */
  forecastCost: number;
  margin: number;
  marginPct: number | null;
  overBudget: boolean;
  invoicedAmount: number;
  unbilled: number;
};

const CATEGORIES: CostCategory[] = [
  "labor",
  "materials",
  "subcontract",
  "other",
];

function emptyCategoryTotals(): CategoryTotals {
  return {
    labor: { budgetCost: 0, budgetPrice: 0, actual: 0, committed: 0 },
    materials: { budgetCost: 0, budgetPrice: 0, actual: 0, committed: 0 },
    subcontract: { budgetCost: 0, budgetPrice: 0, actual: 0, committed: 0 },
    other: { budgetCost: 0, budgetPrice: 0, actual: 0, committed: 0 },
  };
}

export function lineCost(line: EstimateLineInput): number {
  return round2(line.quantity * line.unitCost);
}

export function linePrice(line: EstimateLineInput): number {
  return round2(line.quantity * line.unitPrice);
}

export function timeCost(entry: TimeEntryInput): number {
  return round2(entry.hours * entry.costRate);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Rules:
 * 1. Accepted estimate lines become the budget.
 * 2. Change orders move budget cost AND price.
 * 3. Labor actual = hours × loaded cost rate (snapshotted on the entry).
 * 4. Cost entries: committed counts in forecast until replaced by actual.
 *    Do not double-count: forecast = actuals + open commitments.
 * 5. Margin = current budget price − forecast cost.
 */
export function computeJobMargin(input: {
  lines: EstimateLineInput[];
  timeEntries: TimeEntryInput[];
  costEntries: CostEntryInput[];
  changeOrders: ChangeOrderInput[];
  invoicedAmount?: number;
}): JobMargin {
  const byCategory = emptyCategoryTotals();

  for (const line of input.lines) {
    const cat = byCategory[line.category];
    cat.budgetCost = round2(cat.budgetCost + lineCost(line));
    cat.budgetPrice = round2(cat.budgetPrice + linePrice(line));
  }

  let changeCost = 0;
  let changePrice = 0;
  for (const co of input.changeOrders) {
    changeCost = round2(changeCost + co.costDelta);
    changePrice = round2(changePrice + co.priceDelta);
  }

  // Change orders are not categorized in v1 — fold into "other" budget.
  byCategory.other.budgetCost = round2(byCategory.other.budgetCost + changeCost);
  byCategory.other.budgetPrice = round2(
    byCategory.other.budgetPrice + changePrice,
  );

  let actualLabor = 0;
  for (const t of input.timeEntries) {
    const c = timeCost(t);
    actualLabor = round2(actualLabor + c);
    byCategory.labor.actual = round2(byCategory.labor.actual + c);
  }

  let actualOther = 0;
  let committed = 0;
  for (const e of input.costEntries) {
    if (e.status === "actual") {
      actualOther = round2(actualOther + e.amount);
      byCategory[e.category].actual = round2(
        byCategory[e.category].actual + e.amount,
      );
    } else {
      committed = round2(committed + e.amount);
      byCategory[e.category].committed = round2(
        byCategory[e.category].committed + e.amount,
      );
    }
  }

  const estimateCost = round2(
    CATEGORIES.reduce((s, c) => s + byCategory[c].budgetCost, 0) - changeCost,
  );
  const estimatePrice = round2(
    CATEGORIES.reduce((s, c) => s + byCategory[c].budgetPrice, 0) - changePrice,
  );
  const budgetCost = round2(estimateCost + changeCost);
  const budgetPrice = round2(estimatePrice + changePrice);
  const forecastCost = round2(actualLabor + actualOther + committed);
  const margin = round2(budgetPrice - forecastCost);
  const marginPct =
    budgetPrice > 0 ? round2((margin / budgetPrice) * 100) : null;
  const invoicedAmount = round2(input.invoicedAmount ?? 0);

  return {
    byCategory,
    estimateCost,
    estimatePrice,
    changeCost,
    changePrice,
    budgetCost,
    budgetPrice,
    actualLabor,
    actualOther,
    committed,
    forecastCost,
    margin,
    marginPct,
    overBudget: forecastCost > budgetCost,
    invoicedAmount,
    unbilled: round2(budgetPrice - invoicedAmount),
  };
}
