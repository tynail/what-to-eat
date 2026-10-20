import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); close(); }} aria-label={title}>
    <div className="modal-head"><h2>{title}</h2><button type="button" aria-label="Close dialog" onClick={close}>×</button></div>
    {children}
  </dialog>;
}
