import { useState } from "react";
import { LayoutDashboard, ReceiptText, Wallet, ChartNoAxesCombined, Bot, Settings, LogOut, Menu, X, Sparkles } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import type { User } from "firebase/auth";

const nav = [
  ["Dashboard", "dashboard", LayoutDashboard], ["Transactions", "transactions", ReceiptText],
  ["Budgets", "budgets", Wallet], ["Analytics", "analytics", ChartNoAxesCombined],
  ["AI Assistant", "assistant", Bot], ["Settings", "settings", Settings]
] as const;
export default function Layout({ user, page, setPage, children }: { user: User; page: string; setPage: (p: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>SpendWise <small>AI</small></span><button className="mobile-close" onClick={() => setOpen(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([label, id, Icon]) => <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setOpen(false); }}><Icon size={18}/><span>{label}</span>{id === "assistant" && <span className="nav-new">AI</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile-avatar">{(user.displayName || user.email || "U").slice(0,1).toUpperCase()}</div><div className="profile-info"><b>{user.displayName || "Your account"}</b><small>{user.email}</small></div><button className="icon-btn" title="Log out" onClick={() => signOut(auth)}><LogOut size={17}/></button></div>
    </aside>
    {open && <div className="scrim" onClick={() => setOpen(false)}/>}
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-btn" onClick={() => setOpen(true)}><Menu/></button><div className="breadcrumb">Personal finance <span>/</span> <b>{nav.find(n => n[1] === page)?.[0] ?? "Dashboard"}</b></div><div className="topbar-right"><span className="secure-dot"/> Your data is private</div></header><div className="page-content">{children}</div></main>
  </div>;
}
