import { useState } from "react";
import { LogOut, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiParsed, parseHouseholdUsers, parseLinkResponse, resetCsrf, type Me } from "../../api";
import { useAction } from "../../shared/ui/action";
import { ErrorBox, Header } from "../../shared/ui/page";

/** Displays the current account and sign-out action, plus household access controls for admins. */
export function Settings({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => apiParsed("/admin/users", parseHouseholdUsers), enabled: me.isAdmin });
  const action = useAction();
  const [link, setLink] = useState("");
  /**
   * Creates an invite or reset link at the supplied API path and displays it using
   * the current origin. Request and response-parsing errors propagate to the action handler.
   */
  async function issue(path: string) {
    const result = await apiParsed(path, parseLinkResponse, { method: "POST" });
    setLink(`${location.origin}${result.path}`);
  }
  return <>
    <Header eyebrow="AT HOME HERE" title="Household settings" text="A shared kitchen, with access kept in your hands." />
    <section className="panel"><h2>Your account</h2><p>Signed in as <strong>{me.username}</strong> · {me.isAdmin ? "Admin" : "Member"}</p>
      <button onClick={() => void action.run(async () => { await api("/auth/logout", { method: "POST" }); resetCsrf(); queryClient.clear(); location.assign("/"); })}><LogOut size={16} />Sign out</button>
    </section>
    {me.isAdmin && <section className="panel"><h2>A seat at the table</h2><p className="muted">Invite links expire in 48 hours. Password reset links expire in 1 hour. Each works once.</p>
      <button className="primary" disabled={action.busy} onClick={() => void action.run(() => issue("/admin/invites"))}><Plus size={16} />Create invite link</button>
      {link && <label className="share-link">Copy this private link and share it directly<input readOnly value={link} onFocus={event => event.target.select()} /></label>}
      <ErrorBox error={users.error} />
      {users.data?.map(user => <div className="user-row" key={user.id}><span>{user.username}<small>{user.disabled ? "Disabled" : "Active"}</small></span>
        <button disabled={action.busy || user.disabled} onClick={() => void action.run(() => issue(`/admin/users/${user.id}/reset`))}>Reset password</button>
        {user.id !== me.id && <button disabled={action.busy} onClick={() => { if (confirm(`${user.disabled ? "Enable" : "Disable"} ${user.username}?`)) void action.run(async () => { await api(`/admin/users/${user.id}/toggle`, { method: "POST" }); await users.refetch(); }); }}>{user.disabled ? "Enable" : "Disable"}</button>}
      </div>)}
    </section>}
    <ErrorBox error={action.error} />
  </>;
}
