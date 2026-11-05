import { useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Sparkles, Eye, EyeOff } from "lucide-react";

export default function Auth({ onDemoInfo }: { onDemoInfo: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      if (mode === "register") {
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = err?.code;
      setError(code === "auth/email-already-in-use" ? "This email already has an account." : code === "auth/invalid-credential" ? "Email or password is incorrect." : code === "auth/weak-password" ? "Choose a stronger password." : err?.message || "Authentication failed.");
    } finally { setBusy(false); }
  }
  async function reset() {
    if (!email.trim()) { setError("Enter your email first, then choose reset password."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setNotice("Password reset email sent. Check your inbox."); setError(""); }
    catch (e: any) { setError(e?.message || "Could not send reset email."); }
  }
  return <div className="auth-page"><div className="auth-decoration"><div className="auth-logo"><Sparkles/> SpendWise AI</div><div className="auth-hero"><div className="eyebrow">YOUR MONEY, MADE CLEAR</div><h1>Make every rupee<br/><span>count.</span></h1><p>Understand your spending, stay on budget, and build better money habits with your personal AI finance companion.</p><div className="auth-mini-stats"><div><b>Clarity</b><small>Know where it goes</small></div><div><b>Control</b><small>Budget with confidence</small></div><div><b>Insights</b><small>Make smarter choices</small></div></div></div><div className="auth-footer">Private by design · Your financial data stays yours</div></div>
  <div className="auth-panel"><div className="auth-card"><div className="mobile-auth-logo"><Sparkles/> SpendWise AI</div><div className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</div><h2>{mode === "login" ? "Sign in to your account" : "Create your account"}</h2><p className="muted">{mode === "login" ? "Your financial overview is waiting." : "Start building a clearer picture of your money."}</p>
  <form onSubmit={submit}>{mode === "register" && <label>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" maxLength={80}/></label>}<label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required/></label><label>Password<div className="password-wrap"><input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required/><button type="button" onClick={() => setShow(!show)} aria-label="Toggle password visibility">{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
  {mode === "login" && <button type="button" className="text-button reset-button" onClick={reset}>Forgot password?</button>}
  {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success">{notice}</p>}
  <button className="btn primary auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form>
  <div className="auth-switch">{mode === "login" ? "New to SpendWise?" : "Already have an account?"} <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); }}>{mode === "login" ? "Create account" : "Sign in"}</button></div>
  <div className="auth-note">By continuing, you agree to use SpendWise responsibly. AI insights are informational, not professional financial advice.</div>
  </div></div></div>;
}
