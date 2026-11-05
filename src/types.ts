export type TxType = "income" | "expense";
export const CATEGORIES = ["Food", "Transportation", "Shopping", "Education", "Entertainment", "Healthcare", "Bills and Utilities", "Housing", "Travel", "Other"] as const;
export type Category = typeof CATEGORIES[number];
export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amount: number;
  category: Category;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt?: number;
}
export interface Budget { id: string; month: string; amount: number; updatedAt?: number; }
export interface UserProfile { displayName?: string | null; email?: string | null; }
