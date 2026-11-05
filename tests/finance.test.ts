import { describe, expect, it } from "vitest";
import { balance, budgetUtilization, categoryTotals, sumByType, validateTransaction } from "../src/lib/finance";
import type { Transaction } from "../src/types";

const data: Transaction[] = [
  { id:"a", userId:"u", type:"income", amount:10000, category:"Other", description:"Salary", date:"2026-11-01" },
  { id:"b", userId:"u", type:"expense", amount:500, category:"Food", description:"Lunch", date:"2026-11-02" },
  { id:"c", userId:"u", type:"expense", amount:1000, category:"Shopping", description:"Shoes", date:"2026-10-02" }
];
describe("financial calculations", () => {
  it("sums by type and month", () => { expect(sumByType(data,"expense","2026-11")).toBe(500); expect(sumByType(data,"income","2026-11")).toBe(10000); });
  it("calculates net balance without confusing income and expense", () => { expect(balance(data,"2026-11")).toBe(9500); });
  it("handles budget zero safely", () => { expect(budgetUtilization(0,0)).toBe(0); expect(budgetUtilization(50,0)).toBe(100); expect(budgetUtilization(50,100)).toBe(50); });
  it("aggregates expense categories only", () => { expect(categoryTotals(data,"2026-11")).toEqual([{category:"Food",amount:500}]); });
  it("validates transaction required fields and amount", () => {
    expect(validateTransaction({type:"expense",amount:0,category:"Food",description:"X",date:"2026-11-01"})).toMatch(/greater than zero/);
    expect(validateTransaction({type:"expense",amount:1,category:"Food",description:"X",date:"2026-11-01"})).toBeNull();
  });
});
