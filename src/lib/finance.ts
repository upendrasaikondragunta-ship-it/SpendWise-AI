import type { Transaction } from "../types";

export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function sumByType(transactions: Transaction[], type: "income" | "expense", month?: string): number {
  return transactions.filter(t => t.type === type && (!month || t.date.startsWith(month))).reduce((sum, t) => sum + t.amount, 0);
}
export function balance(transactions: Transaction[], month?: string): number {
  return sumByType(transactions, "income", month) - sumByType(transactions, "expense", month);
}
export function budgetUtilization(expenses: number, budget: number): number {
  if (budget <= 0) return expenses > 0 ? 100 : 0;
  return Math.min(1000, Math.max(0, (expenses / budget) * 100));
}
export function categoryTotals(transactions: Transaction[], month?: string) {
  const result: Record<string, number> = {};
  transactions.filter(t => t.type === "expense" && (!month || t.date.startsWith(month))).forEach(t => {
    result[t.category] = (result[t.category] ?? 0) + t.amount;
  });
  return Object.entries(result).map(([category, amount]) => ({ category, amount })).sort((a,b) => b.amount-a.amount);
}
export function monthlyTotals(transactions: Transaction[], count = 6) {
  const months: { month: string; income: number; expenses: number }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({ month: d.toLocaleDateString("en-IN", { month: "short" }), income: sumByType(transactions, "income", key), expenses: sumByType(transactions, "expense", key) });
  }
  return months;
}
export function validateTransaction(input: Partial<Transaction>): string | null {
  if (input.type !== "income" && input.type !== "expense") return "Choose income or expense.";
  if (!Number.isFinite(input.amount) || Number(input.amount) <= 0) return "Amount must be greater than zero.";
  if (!input.category || !["Food","Transportation","Shopping","Education","Entertainment","Healthcare","Bills and Utilities","Housing","Travel","Other"].includes(input.category)) return "Choose a valid category.";
  if (!input.description?.trim()) return "Description is required.";
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) return "Enter a valid date.";
  return null;
}
