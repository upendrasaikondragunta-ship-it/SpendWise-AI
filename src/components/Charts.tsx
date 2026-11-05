import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import type { Transaction } from "../types";
import { categoryTotals, monthlyTotals, money } from "../lib/finance";

const COLORS = ["#7c8cff", "#35c9a5", "#f6b94a", "#f7799a", "#8b6cf6", "#4db8e8", "#f28b50", "#b4d455", "#d47ce7", "#91a4b7"];
export function MonthlyChart({ transactions }: { transactions: Transaction[] }) {
  const data = monthlyTotals(transactions);
  return <div className="chart"><ResponsiveContainer width="100%" height={260}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#263247"/><XAxis dataKey="month" stroke="#8b9ab0"/><YAxis stroke="#8b9ab0"/><Tooltip formatter={(v) => money(Number(v))}/><Legend/><Bar dataKey="income" fill="#35c9a5" radius={[5,5,0,0]}/><Bar dataKey="expenses" fill="#7c8cff" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>;
}
export function CategoryChart({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const data = categoryTotals(transactions, month);
  if (!data.length) return <div className="empty-chart">No expenses for this month yet.</div>;
  return <div className="chart"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={data} dataKey="amount" nameKey="category" outerRadius={95} label={({ category }) => category}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => money(Number(v))}/><Legend/></PieChart></ResponsiveContainer></div>;
}
export function TrendChart({ transactions }: { transactions: Transaction[] }) {
  return <div className="chart"><ResponsiveContainer width="100%" height={260}><LineChart data={monthlyTotals(transactions, 12)}><CartesianGrid strokeDasharray="3 3" stroke="#263247"/><XAxis dataKey="month" stroke="#8b9ab0"/><YAxis stroke="#8b9ab0"/><Tooltip formatter={(v) => money(Number(v))}/><Legend/><Line type="monotone" dataKey="expenses" stroke="#7c8cff" strokeWidth={3}/></LineChart></ResponsiveContainer></div>;
}
