import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Leaf } from "lucide-react";
import { useState } from "react";
import { api, resetCsrf } from "../../api";
import { useAction } from "../../shared/ui/action";
import { ErrorBox } from "../../shared/ui/page";

type AccessLink =
  | { kind: "invite"; token: string }
  | { kind: "reset"; token: string }
  | { kind: "invalid" };

function parseAccessLink(fragment: string): AccessLink {
  const separator = fragment.indexOf(":");
  if (separator < 0) return { kind: "invalid" };

  const kind = fragment.slice(1, separator);
  const token = fragment.slice(separator + 1);
  if (!token || token.includes(":")) return { kind: "invalid" };
  if (kind === "invite") return { kind, token };
  if (kind === "reset") return { kind, token };
  return { kind: "invalid" };
}

const accessLink = parseAccessLink(location.hash);

export function Login({ join = false }: { join?: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  const action = useAction();
  const queryClient = useQueryClient();
  const [link] = useState(() => accessLink);
  const reset = join && link.kind === "reset";

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Leaf size={40} />
        <p className="eyebrow">WELCOME TO WEEKLY TABLE</p>
        <h1>
          Less deciding.
          <br />
          More enjoying.
        </h1>
        <p>
          Your favorite recipes. A fresh plan.
          <br />A good week around the table.
        </p>
      </section>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            if (join) {
              if (link.kind === "invalid") throw new Error("This link is invalid. Ask your household admin for a new one.");
              await api("/auth/redeem", {
                method: "POST",
                body: {
                token: link.token,
                username,
                password,
                },
              });
              setDone(true);
            } else {
              await api("/auth/login", { method: "POST", body: { username, password } });
              resetCsrf();
              await queryClient.invalidateQueries({ queryKey: ["me"] });
            }
          });
        }}
      >
        <p className="eyebrow">YOUR HOUSEHOLD KITCHEN</p>
        <h2>
          {done
            ? "You’re all set."
            : join
              ? reset
                ? "Reset password"
                : "Pull up a chair."
              : "Welcome back."}
        </h2>
        {done ? (
          <a className="button primary" href="/">
            Sign in <ArrowRight size={16} />
          </a>
        ) : (
          <>
            <p className="muted">
              {join
                ? link.kind === "invalid"
                  ? "This link is invalid. Ask your household admin for a new one."
                  : "Use at least 12 characters with uppercase, lowercase, number, and symbol."
                : "Sign in to plan something delicious."}
            </p>
            {!reset && (
              <label>
                Username
                <input
                  required
                  maxLength={80}
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
            )}
            <label>
              Password
              <input
                required
                type="password"
                minLength={join ? 12 : 1}
                autoComplete={join ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <ErrorBox error={action.error} />
            <button className="primary" disabled={action.busy || (join && link.kind === "invalid")}>
              {action.busy ? "Working…" : join ? "Save account" : "Sign in"}
              <ArrowRight size={16} />
            </button>
            <small>
              Invite-only access. Need help? Ask your household admin.
            </small>
          </>
        )}
      </form>
    </div>
  );
}
