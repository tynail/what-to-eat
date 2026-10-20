import type { ReactNode } from "react";
import { Utensils } from "lucide-react";

export function ErrorBox({ error }: { error: unknown }) {
  return error ? <p className="error" role="alert">{error instanceof Error ? error.message : String(error)}</p> : null;
}

export function Header({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{text}</p></div>{children}</header>;
}

export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><Utensils size={32} /><h3>{title}</h3><p>{text}</p></div>;
}
