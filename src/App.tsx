import { useEffect, useMemo, useState } from "react";

import { doc, setDoc } from "firebase/firestore";

import { auth, db, firebaseConfigured, firebaseConfigMissing } from "./lib/firebase";

import { useAuth } from "./hooks/useAuth";

import { subscribeTransactions, createTransaction, saveTransaction, removeTransaction, getBudget, saveBudget } from "./lib/data";

import { balance, budgetUtilization, categoryTotals, money, monthKey, sumByType } from "./lib/finance";

import { downloadCsv } from "./lib/csv";

import type { Budget, Transaction } from "./types";

import Layout from "./components/Layout";

import Auth from "./components/Auth";

import TransactionForm from "./components/TransactionForm";

import { MonthlyChart, CategoryChart, TrendChart } from "./components/Charts";

import { Activity, ArrowDownLeft, ArrowUpRight, Wallet, Plus, Search, Download, Pencil, Trash2, X, Sparkles, Bot, AlertTriangle, CheckCircle2, ChevronRight, CalendarDays, LoaderCircle } from "lucide-react";



const currentMonth = monthKey();

const prettyMonth = (key: string) => new Date(`${key}-01T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section>; }

function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }

function Stat({ label, value, icon, tone, detail }: { label: string; value: string; icon: React.ReactNode; tone: string; detail: string }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><strong>{value}</strong><small>{detail}</small></div>; }

function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><div className="empty-icon"><Activity/></div><b>{title}</b><p>{text}</p></div>; }



export default function App() {

  const { user, loading } = useAuth();

  const [page, setPage] = useState("dashboard");

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [dataLoading, setDataLoading] = useState(true);

  const [dataError, setDataError] = useState("");

  const [month, setMonth] = useState(currentMonth);

  const [budget, setBudget] = useState<Budget | null>(null);

  const [budgetInput, setBudgetInput] = useState("");

  const [modal, setModal] = useState<"add" | "edit" | null>(null);

  const [editing, setEditing] = useState<Transaction | null>(null);

  const [search, setSearch] = useState("");

  const [filterType, setFilterType] = useState("all");

  const [filterCategory, setFilterCategory] = useState("all");

  const [filterStart, setFilterStart] = useState("");

  const [filterEnd, setFilterEnd] = useState("");

  const [toast, setToast] = useState("");

  const [aiQuestion, setAiQuestion] = useState("");

  const [aiAnswer, setAiAnswer] = useState("");

  const [aiBusy, setAiBusy] = useState(false);

  const [aiError, setAiError] = useState("");

  const [profileName, setProfileName] = useState("");



  useEffect(() => {

    if (!user) return;

    setProfileName(user.displayName || "");

    const unsub = subscribeTransactions(user.uid, list => { setTransactions(list); setDataLoading(false); }, e => { setDataError(e.message); setDataLoading(false); });

    return unsub;

  }, [user]);



  useEffect(() => {

    if (!user) return;

    getBudget(user.uid, month).then(b => { setBudget(b); setBudgetInput(b ? String(b.amount) : ""); }).catch(e => setToast(e.message));

  }, [user, month]);



  const monthTransactions = useMemo(() => transactions.filter(t => t.date.startsWith(month)), [transactions, month]);

  const income = sumByType(transactions, "income", month);

  const expenses = sumByType(transactions, "expense", month);

  const utilization = budgetUtilization(expenses, budget?.amount ?? 0);

  const remaining = Math.max(0, (budget?.amount ?? 0) - expenses);

  const filtered = useMemo(() => transactions.filter(t => {

    const matchesSearch = `${t.description} ${t.category}`.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === "all" || t.type === filterType;

    const matchesCategory = filterCategory === "all" || t.category === filterCategory;

    const matchesStart = !filterStart || t.date >= filterStart;

    const matchesEnd = !filterEnd || t.date <= filterEnd;

    return matchesSearch && matchesType && matchesCategory && matchesStart && matchesEnd;

  }), [transactions, search, filterType, filterCategory, filterStart, filterEnd]);



  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3200); }

  async function submitTransaction(value: Omit<Transaction, "id" | "userId">) {

    if (!user) return;

    if (editing) await saveTransaction(user.uid, { ...editing, ...value });

    else await createTransaction(user.uid, value);

    setModal(null); setEditing(null); notify(editing ? "Transaction updated." : "Transaction added.");

  }

  async function deleteTx(tx: Transaction) {

    if (!user || !window.confirm(`Delete "${tx.description}" (${money(tx.amount)})? This cannot be undone.`)) return;

    try { await removeTransaction(user.uid, tx.id); notify("Transaction deleted."); }

    catch (e) { notify(e instanceof Error ? e.message : "Delete failed."); }

  }

  async function updateBudget(e: React.FormEvent) {

    e.preventDefault();

    const amount = Number(budgetInput);

    if (!user || !Number.isFinite(amount) || amount < 0) { notify("Enter a valid budget amount (0 or more)."); return; }

    try { await saveBudget(user.uid, month, amount); setBudget({ id: month, month, amount }); notify("Monthly budget saved."); }

    catch (e) { notify(e instanceof Error ? e.message : "Could not save budget."); }

  }

  async function askAI(question = aiQuestion) {

    if (!user || !question.trim()) return;

    setAiBusy(true); setAiError(""); setAiAnswer("");

    try {

      const token = await user.getIdToken();

      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: question.trim(), month }) });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "AI assistant is temporarily unavailable.");

      setAiAnswer(data.answer);

    } catch (e) { setAiError(e instanceof Error ? e.message : "Unable to contact AI assistant."); }

    finally { setAiBusy(false); }

  }

  async function saveProfile(e: React.FormEvent) {

    e.preventDefault();

    if (!user) return;

    try { await setDoc(doc(db, "users", user.uid, "settings", "profile"), { displayName: profileName.trim(), email: user.email, updatedAt: Date.now() }, { merge: true }); notify("Profile settings saved."); }

    catch (e) { notify(e instanceof Error ? e.message : "Could not save settings."); }

  }



  if (loading) return <div className="loading-screen"><div className="brand-mark"><Sparkles/></div><span>Loading SpendWise…</span></div>;

  if (!user) return <Auth onDemoInfo={() => {}}/>;

  const transactionRows = (list: Transaction[]) => list.map(tx => <tr key={tx.id}><td><div className="tx-name"><span className={`tx-symbol ${tx.type}`}>{tx.type === "income" ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><div><b>{tx.description}</b><small>{tx.category}</small></div></div></td><td>{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td><span className={`type-pill ${tx.type}`}>{tx.type}</span></td><td className={`amount ${tx.type}`}>{tx.type === "income" ? "+" : "−"}{money(tx.amount)}</td><td><div className="row-actions"><button title="Edit" className="icon-btn" onClick={() => { setEditing(tx); setModal("edit"); }}><Pencil size={15}/></button><button title="Delete" className="icon-btn danger-icon" onClick={() => deleteTx(tx)}><Trash2 size={15}/></button></div></td></tr>);



  return <Layout user={user} page={page} setPage={setPage}>

    {firebaseConfigured === false && <div className="notice warning"><AlertTriangle size={18}/><div><b>Firebase setup required</b><p>Copy <code>.env.example</code> to <code>.env</code> and fill these fields: {firebaseConfigMissing.join(", ")}. Authentication and cloud data won't work until configured.</p></div></div>}

    {dataError && <div className="notice warning"><AlertTriangle/><span>Could not load transactions: {dataError}</span></div>}

    {page === "dashboard" && <>

      <PageTitle title="Good to see you, " subtitle="Here’s your financial snapshot for the month." action={<div className="month-picker"><CalendarDays size={16}/><input type="month" value={month} onChange={e => setMonth(e.target.value)}/></div>}/>

      <div className="welcome-strip"><div><span className="eyebrow">MONTHLY OVERVIEW</span><h2>Take control of your money.</h2><p>Small, informed decisions today can make a meaningful difference tomorrow.</p></div><div className="welcome-orb"><Sparkles size={30}/></div></div>

      <div className="stats-grid"><Stat label="Total income" value={money(income)} icon={<ArrowDownLeft/>} tone="green" detail="Income this month"/><Stat label="Total expenses" value={money(expenses)} icon={<ArrowUpRight/>} tone="purple" detail="Expenses this month"/><Stat label="Net balance" value={money(balance(transactions, month))} icon={<Wallet/>} tone="blue" detail="Income minus expenses"/><Stat label="Budget remaining" value={budget ? money(remaining) : "Not set"} icon={<Activity/>} tone="amber" detail={budget ? `${Math.round(utilization)}% of budget used` : "Set a monthly budget"}/></div>

      <div className="dashboard-grid"><Card><div className="panel-heading"><div><h3>Income vs. expenses</h3><p>Your six-month cash flow</p></div><button className="text-button" onClick={() => setPage("analytics")}>Details <ChevronRight size={15}/></button></div><MonthlyChart transactions={transactions}/></Card><Card><div className="panel-heading"><div><h3>Spending by category</h3><p>{prettyMonth(month)}</p></div></div><CategoryChart transactions={transactions} month={month}/></Card></div>

      <div className="dashboard-grid bottom-grid"><Card><div className="panel-heading"><div><h3>Recent transactions</h3><p>Your latest financial activity</p></div><button className="text-button" onClick={() => setPage("transactions")}>View all <ChevronRight size={15}/></button></div>{dataLoading ? <div className="inline-loading"><LoaderCircle className="spin"/> Loading transactions…</div> : transactions.length ? <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Date</th><th>Type</th><th>Amount</th><th/></tr></thead><tbody>{transactionRows(transactions.slice(0,5))}</tbody></table></div> : <Empty title="Your story starts here" text="Add your first income or expense to see it appear here."/>}</Card><Card><div className="panel-heading"><div><h3>Monthly budget</h3><p>{prettyMonth(month)}</p></div><button className="text-button" onClick={() => setPage("budgets")}>Manage <ChevronRight size={15}/></button></div>{budget ? <><div className="budget-amount"><b>{money(expenses)}</b><span>of {money(budget.amount)}</span></div><div className="progress-track"><div className={`progress-fill ${utilization >= 100 ? "over" : utilization >= 80 ? "near" : ""}`} style={{width: `${Math.min(utilization,100)}%`}}/></div><div className="budget-meta"><span>{Math.round(utilization)}% used</span><span>{money(remaining)} left</span></div>{utilization >= 80 && <p className={`budget-alert ${utilization >= 100 ? "over" : ""}`}><AlertTriangle size={15}/>{utilization >= 100 ? "You’ve reached your budget." : "You’re approaching your budget limit."}</p>}</> : <div className="budget-empty"><Wallet/><p>Set a monthly budget to keep your spending on track.</p><button className="btn secondary" onClick={() => setPage("budgets")}>Set budget</button></div>}</Card></div>

    </>}

    {page === "transactions" && <>

      <PageTitle title="Transactions" subtitle="Every rupee, accounted for." action={<button className="btn primary" onClick={() => { setEditing(null); setModal("add"); }}><Plus size={17}/> Add transaction</button>}/>

      <Card><div className="filter-bar"><div className="search-field"><Search size={17}/><input placeholder="Search description or category…" value={search} onChange={e => setSearch(e.target.value)}/></div><select value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">All categories</option>{["Food","Transportation","Shopping","Education","Entertainment","Healthcare","Bills and Utilities","Housing","Travel","Other"].map(c => <option key={c}>{c}</option>)}</select><input aria-label="Start date" type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}/><input aria-label="End date" type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}/><button className="btn secondary" onClick={() => downloadCsv(filtered)}><Download size={16}/> Export CSV</button></div>

      {dataLoading ? <div className="inline-loading"><LoaderCircle className="spin"/> Loading transactions…</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Date</th><th>Type</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{transactionRows(filtered)}</tbody></table></div> : <Empty title="No matching transactions" text="Try changing your filters, or add a new transaction."/>}

      <div className="table-foot">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""} · {money(filtered.reduce((s,t) => s + (t.type === "income" ? t.amount : -t.amount),0))} net shown</div></Card>

    </>}

    {page === "budgets" && <>

      <PageTitle title="Budgets" subtitle="Set a spending limit and keep your month on track." action={<div className="month-picker"><CalendarDays size={16}/><input type="month" value={month} onChange={e => setMonth(e.target.value)}/></div>}/>

      <div className="stats-grid"><Stat label="Monthly limit" value={budget ? money(budget.amount) : "Not set"} icon={<Wallet/>} tone="blue" detail={prettyMonth(month)}/><Stat label="Spent so far" value={money(expenses)} icon={<ArrowUpRight/>} tone="purple" detail="Expenses only"/><Stat label="Remaining" value={budget ? money(remaining) : "—"} icon={<CheckCircle2/>} tone="green" detail="Available this month"/><Stat label="Budget used" value={budget ? `${Math.round(utilization)}%` : "—"} icon={<Activity/>} tone="amber" detail="Monthly utilization"/></div>

      <div className="dashboard-grid"><Card><div className="panel-heading"><div><h3>Set your monthly budget</h3><p>Budget applies to {prettyMonth(month)}.</p></div></div><form className="budget-form" onSubmit={updateBudget}><label>Monthly spending limit (₹)<input type="number" min="0" step="0.01" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="e.g. 15000" required/></label><p className="muted">Enter 0 if you want to track expenses without a spending cap.</p><button className="btn primary">Save budget</button></form></Card><Card><div className="panel-heading"><div><h3>Budget progress</h3><p>{prettyMonth(month)}</p></div></div>{budget ? <><div className="budget-amount"><b>{money(expenses)}</b><span>spent of {money(budget.amount)}</span></div><div className="progress-track large"><div className={`progress-fill ${utilization >= 100 ? "over" : utilization >= 80 ? "near" : ""}`} style={{width: `${Math.min(utilization,100)}%`}}/></div><div className="budget-meta"><span>{Math.round(utilization)}% used</span><span>{money(remaining)} remaining</span></div><div className="budget-status">{utilization >= 100 ? <><AlertTriangle/> Budget limit reached. Consider reviewing your spending.</> : utilization >= 80 ? <><AlertTriangle/> You’re close to your budget limit.</> : <><CheckCircle2/> You’re within your budget. Keep it up!</>}</div></> : <Empty title="No budget set yet" text="Add a monthly limit to see your progress." />}</Card></div>

      <Card><div className="panel-heading"><div><h3>Spending breakdown</h3><p>Where your budget is going</p></div></div><CategoryChart transactions={transactions} month={month}/></Card>

    </>}

    {page === "analytics" && <>

      <PageTitle title="Analytics" subtitle="Explore patterns behind your financial activity." action={<div className="month-picker"><CalendarDays size={16}/><input type="month" value={month} onChange={e => setMonth(e.target.value)}/></div>}/>

      <div className="stats-grid"><Stat label="Income" value={money(income)} icon={<ArrowDownLeft/>} tone="green" detail={prettyMonth(month)}/><Stat label="Expenses" value={money(expenses)} icon={<ArrowUpRight/>} tone="purple" detail={prettyMonth(month)}/><Stat label="Net savings" value={money(income-expenses)} icon={<Wallet/>} tone="blue" detail="Income less expenses"/><Stat label="Transactions" value={String(monthTransactions.length)} icon={<Activity/>} tone="amber" detail="This month"/></div>

      <Card><div className="panel-heading"><div><h3>Monthly income & expenses</h3><p>Compare cash flow over the last six months</p></div></div><MonthlyChart transactions={transactions}/></Card><Card><div className="panel-heading"><div><h3>Expense trend</h3><p>12-month spending pattern</p></div></div><TrendChart transactions={transactions}/></Card><Card><div className="panel-heading"><div><h3>Category breakdown</h3><p>{prettyMonth(month)}</p></div></div><CategoryChart transactions={transactions} month={month}/>{categoryTotals(transactions, month).length > 0 && <div className="category-list">{categoryTotals(transactions, month).map((c,i)=><div key={c.category}><span className="category-dot" style={{background:["#7c8cff","#35c9a5","#f6b94a","#f7799a","#8b6cf6"][i%5]}}/><span>{c.category}</span><b>{money(c.amount)}</b></div>)}</div>}</Card>

    </>}

    {page === "assistant" && <>

      <PageTitle title="AI Spending Assistant" subtitle="A financial companion that understands your actual spending."/>

      <div className="ai-hero"><div className="ai-orb"><Sparkles size={27}/></div><div><span className="eyebrow">GEMINI-POWERED INSIGHTS</span><h2>Let’s make sense of your money.</h2><p>Ask questions about your spending, budget, or habits. I’ll use your records to give you grounded insights.</p></div><span className="ai-status"><span/> AI ready</span></div>

      <div className="ai-layout"><Card className="ai-chat"><div className="panel-heading"><div><h3><Bot size={18}/> Ask your finance assistant</h3><p>Context: {prettyMonth(month)} · Your personal records</p></div><div className="month-picker"><input type="month" value={month} onChange={e => setMonth(e.target.value)}/></div></div>

      <div className="suggestions"><span>TRY ASKING</span>{["How much did I spend this month?","Which category costs me the most?","Compare this month with last month.","How can I reduce my expenses?"].map(q=><button key={q} onClick={() => { setAiQuestion(q); askAI(q); }}>{q}<ChevronRight size={14}/></button>)}</div>

      {aiBusy && <div className="ai-message assistant"><div className="ai-message-icon"><Sparkles size={16}/></div><div><b>Analyzing your finances…</b><p>Reviewing your selected month and relevant records.</p><LoaderCircle className="spin"/></div></div>}

      {aiAnswer && <div className="ai-message assistant"><div className="ai-message-icon"><Sparkles size={16}/></div><div><b>SpendWise AI</b><p className="ai-response">{aiAnswer}</p></div></div>}

      {aiError && <div className="notice warning"><AlertTriangle size={17}/><div><b>Couldn’t get an AI response</b><p>{aiError}</p><button className="text-button" onClick={() => askAI()}>Retry</button></div></div>}

      <form className="ai-input" onSubmit={e => { e.preventDefault(); askAI(); }}><textarea value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} maxLength={1000} placeholder="Ask about your spending, budget, or financial habits…" rows={2}/><button className="btn primary" disabled={aiBusy || !aiQuestion.trim()}><Sparkles size={16}/> Ask AI</button></form><p className="ai-disclaimer">AI insights are informational only and not professional financial advice. Verify important decisions independently.</p></Card>

      <Card className="ai-context"><div className="panel-heading"><div><h3>Your financial context</h3><p>Data available for AI analysis</p></div></div><div className="context-stat"><span>Income this month</span><b>{money(income)}</b></div><div className="context-stat"><span>Expenses this month</span><b>{money(expenses)}</b></div><div className="context-stat"><span>Budget</span><b>{budget ? money(budget.amount) : "Not set"}</b></div><div className="context-stat"><span>Records available</span><b>{transactions.length}</b></div><div className="context-note"><CheckCircle2 size={16}/> Only your authenticated account’s data is used.</div></Card></div>

    </>}

    {page === "settings" && <>

      <PageTitle title="Settings" subtitle="Manage your profile and account preferences."/>

      <div className="settings-grid"><Card><div className="panel-heading"><div><h3>Profile</h3><p>Update how your account appears.</p></div></div><form className="budget-form" onSubmit={saveProfile}><label>Display name<input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={80} placeholder="Your name"/></label><label>Email address<input value={user.email || ""} disabled/></label><button className="btn primary">Save profile</button></form></Card><Card><div className="panel-heading"><div><h3>Privacy & security</h3><p>How SpendWise protects your information.</p></div></div><div className="security-row"><CheckCircle2/><div><b>Firebase authentication</b><small>Secure sign-in and identity management.</small></div></div><div className="security-row"><CheckCircle2/><div><b>Private financial records</b><small>Firestore rules restrict data access to your user account.</small></div></div><div className="security-row"><CheckCircle2/><div><b>Server-side AI requests</b><small>Gemini API keys are not sent to your browser.</small></div></div><div className="security-row"><CheckCircle2/><div><b>Sign-in email</b><small>{user.email}</small></div></div></Card></div>

      <Card><div className="panel-heading"><div><h3>About SpendWise AI</h3><p>Personal finance made clearer.</p></div></div><p className="about-text">SpendWise AI helps you record financial activity, manage a monthly budget, explore trends, and ask grounded questions about your spending. It is an educational and informational tool—not a bank, tax adviser, or professional financial adviser.</p><button className="btn secondary" onClick={() => auth.signOut()}>Sign out</button></Card>

    </>}

    {modal && <div className="modal-backdrop" onClick={() => { setModal(null); setEditing(null); }}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><h2>{modal === "edit" ? "Edit transaction" : "Add transaction"}</h2><p>Keep your financial records accurate.</p></div><button className="icon-btn" onClick={() => { setModal(null); setEditing(null); }}><X/></button></div><TransactionForm initial={modal === "edit" ? editing : null} onSave={submitTransaction} onCancel={() => { setModal(null); setEditing(null); }}/></div></div>}

    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}

  </Layout>;

}
