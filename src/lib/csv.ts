import type { Transaction } from "../types";
export function exportTransactionsCsv(transactions: Transaction[]) {
  const columns = ["Date", "Type", "Amount (INR)", "Category", "Description"];
 const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = transactions.map(t => [t.date, t.type, t.amount.toFixed(2), t.category, t.description].map(escape).join(","));
  return [columns.map(escape).join(","), ...rows].join("\r\n");
}
export function downloadCsv(transactions: Transaction[]) {
  const blob = new Blob([exportTransactionsCsv(transactions)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `spendwise-transactions-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
