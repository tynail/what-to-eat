import { useState } from "react";
import { ArrowRight, Leaf } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, resetCsrf } from "../../api";
import { useAction } from "../../shared/ui/action";
import { ErrorBox } from "../../shared/ui/page";

const accessLink = location.hash.slice(1).split(":");

export function Login({ join = false }: { join?: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const action = useAction();
  const queryClient = useQueryClient();
  const [link] = useState(accessLink);
  const reset = link[0] === "reset";
  return <div className="auth-page"><section className="auth-story"><Leaf size={40} /><p className="eyebrow">WELCOME TO WEEKLY TABLE</p><h1>Less deciding.<br />More enjoying.</h1><p>Your favorite recipes. A fresh plan.<br />A good week around the table.</p></section>
    <form className="auth-form" onSubmit={event => { event.preventDefault(); void action.run(async () => {
      if (join) { await api("/auth/redeem", "POST", { token: link[1] || "", username, password }); setDone(true); }
      else { await api("/auth/login", "POST", { username, password }); resetCsrf(); await queryClient.invalidateQueries({ queryKey: ["me"] }); }
    }); }}>
      <p className="eyebrow">YOUR HOUSEHOLD KITCHEN</p><h2>{done ? "You’re all set." : join ? reset ? "Reset password" : "Pull up a chair." : "Welcome back."}</h2>
      {done ? <a className="button primary" href="/">Sign in <ArrowRight size={16} /></a> : <>
        <p className="muted">{join ? "Use at least 12 characters with uppercase, lowercase, number, and symbol." : "Sign in to plan something delicious."}</p>
        {!reset && <label>Username<input required maxLength={80} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} /></label>}
        <label>Password<input required type="password" minLength={join ? 12 : 1} autoComplete={join ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <ErrorBox error={action.error} /><button className="primary" disabled={action.busy}>{action.busy ? "Working…" : join ? "Save account" : "Sign in"}<ArrowRight size={16} /></button><small>Invite-only access. Need help? Ask your household admin.</small>
      </>}
    </form>
  </div>;
}
