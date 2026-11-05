import { describe, expect, it } from "vitest";
import { exportTransactionsCsv } from "../src/lib/csv";
describe("CSV export", () => {
  it("escapes commas and quotes in descriptions", () => {
    const csv = exportTransactionsCsv([{ id:"1", userId:"u", type:"expense", amount:12.5, category:"Food", description:'Lunch, "team"', date:"2026-11-01" }]);
    expect(csv).toContain('"Lunch, ""team"""');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
