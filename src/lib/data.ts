import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Budget, Transaction } from "../types";

const userCollection = (uid: string, name: "transactions" | "budgets") => collection(db, "users", uid, name);
export function subscribeTransactions(uid: string, callback: (items: Transaction[]) => void, onError: (error: Error) => void) {
  const q = query(userCollection(uid, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), onError);
}
export async function createTransaction(uid: string, transaction: Omit<Transaction, "id" | "userId">) {
  const ref = await addDoc(userCollection(uid, "transactions"), { ...transaction, userId: uid, createdAt: Date.now() });
  return ref.id;
}
export async function saveTransaction(uid: string, tx: Transaction) {
  const ref = doc(db, "users", uid, "transactions", tx.id);
  const { id, ...data } = tx;
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}
export async function removeTransaction(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "transactions", id));
}
export async function getBudget(uid: string, month: string): Promise<Budget | null> {
  const ref = doc(db, "users", uid, "budgets", month);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Budget) : null;
}
export async function saveBudget(uid: string, month: string, amount: number) {
  await setDoc(doc(db, "users", uid, "budgets", month), { month, amount, updatedAt: Date.now() });
}
