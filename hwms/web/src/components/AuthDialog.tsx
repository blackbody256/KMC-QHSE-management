import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icon";

interface AuthDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  icon: IconName;
  tone: "signin" | "signout";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A deliberately small authentication checkpoint.
 *
 * Native dialog semantics give keyboard users Escape handling, focus
 * containment and a proper modal announcement without recreating browser
 * behaviour in JavaScript. It never collects credentials; Keycloak continues
 * to own that boundary.
 */
export function AuthDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  icon,
  tone,
  busy = false,
  onConfirm,
  onClose,
}: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`auth-dialog auth-dialog--${tone}`}
      aria-labelledby={`auth-dialog-${tone}-title`}
      aria-describedby={`auth-dialog-${tone}-description`}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="auth-dialog-card">
        <span className="auth-dialog-icon" aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>

        <div className="auth-dialog-copy">
          <span className="auth-dialog-kicker">
            {tone === "signin" ? "Secure access" : "Session control"}
          </span>
          <h2 id={`auth-dialog-${tone}-title`}>{title}</h2>
          <p id={`auth-dialog-${tone}-description`}>{description}</p>
        </div>

        <div className="auth-dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="auth-dialog-confirm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (tone === "signin" ? "Opening sign in…" : "Signing out…") : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
