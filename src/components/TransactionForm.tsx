import { useState } from "react";
import { CATEGORIES, type Transaction, type TxType } from "../types";
import { validateTransaction } from "../lib/finance";

type Props = { initial?: Transaction | null; onSave: (value: Omit<Transaction, "id" | "userId">) => Promise<void>; onCancel: () => void };
export default function TransactionForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<Transaction["category"]>(initial?.category ?? "Food");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0,10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = { type, amount: Number(amount), category, description: description.trim(), date };
    const validation = validateTransaction(value);
    if (validation) { setError(validation); return; }
    setError(""); setSaving(true);
    try { await onSave(value); } catch (err) { setError(err instanceof Error ? err.message : "Could not save transaction."); }
    finally { setSaving(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>Transaction type<select value={type} onChange={e => setType(e.target.value as TxType)}><option value="expense">Expense</option><option value="income">Income</option></select></label>
    <label>Amount (₹)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required /></label>
    <label>Category<select value={category} onChange={e => setCategory(e.target.value as Transaction["category"])}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
    <label className="wide">Description<input maxLength={120} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Lunch with friends" required /></label>
    {error && <p className="error wide" role="alert">{error}</p>}
    <div className="form-actions wide"><button className="btn secondary" type="button" onClick={onCancel}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Add transaction"}</button></div>
  </form>;
}
