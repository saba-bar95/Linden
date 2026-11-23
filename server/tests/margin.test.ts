import { describe, expect, it } from "vitest";
import { computeJobMargin } from "../margin.ts";

describe("computeJobMargin", () => {
  it("matches the stair-rail example from the product brief", () => {
    const margin = computeJobMargin({
      lines: [
        {
          category: "materials",
          quantity: 1,
          unitCost: 1200,
          unitPrice: 1560,
        },
        {
          category: "labor",
          quantity: 40,
          unitCost: 35,
          unitPrice: 70,
        },
        {
          category: "subcontract",
          quantity: 1,
          unitCost: 900,
          unitPrice: 1100,
        },
      ],
      timeEntries: [{ hours: 52, costRate: 35 }],
      costEntries: [
        { category: "materials", amount: 1450, status: "actual" },
        { category: "subcontract", amount: 900, status: "committed" },
      ],
      changeOrders: [{ costDelta: 400, priceDelta: 700 }],
      invoicedAmount: 3000,
    });

    expect(margin.estimateCost).toBe(3500);
    expect(margin.estimatePrice).toBe(5460);
    expect(margin.budgetCost).toBe(3900);
    expect(margin.budgetPrice).toBe(6160);
    expect(margin.actualLabor).toBe(1820);
    expect(margin.actualOther).toBe(1450);
    expect(margin.committed).toBe(900);
    expect(margin.forecastCost).toBe(4170);
    expect(margin.margin).toBe(1990);
    expect(margin.marginPct).toBe(32.31);
    expect(margin.overBudget).toBe(true);
    expect(margin.unbilled).toBe(3160);
  });

  it("does not double-count committed once billed as actual", () => {
    const withCommitment = computeJobMargin({
      lines: [
        { category: "materials", quantity: 1, unitCost: 100, unitPrice: 150 },
      ],
      timeEntries: [],
      costEntries: [{ category: "materials", amount: 100, status: "committed" }],
      changeOrders: [],
    });
    expect(withCommitment.forecastCost).toBe(100);

    const afterBill = computeJobMargin({
      lines: [
        { category: "materials", quantity: 1, unitCost: 100, unitPrice: 150 },
      ],
      timeEntries: [],
      costEntries: [{ category: "materials", amount: 100, status: "actual" }],
      changeOrders: [],
    });
    expect(afterBill.forecastCost).toBe(100);
    expect(afterBill.committed).toBe(0);
  });

  it("uses loaded labor rate, not bill rate", () => {
    const margin = computeJobMargin({
      lines: [
        { category: "labor", quantity: 10, unitCost: 40, unitPrice: 80 },
      ],
      timeEntries: [{ hours: 10, costRate: 40 }],
      costEntries: [],
      changeOrders: [],
    });
    expect(margin.actualLabor).toBe(400);
    expect(margin.margin).toBe(400);
  });
});
