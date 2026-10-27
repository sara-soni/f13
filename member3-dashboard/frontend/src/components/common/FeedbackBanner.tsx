import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface FeedbackBannerProps {
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}

export default function FeedbackBanner({
  type,
  title,
  message,
  actionText,
  onAction,
  onClose,
  children,
}: FeedbackBannerProps) {
  const icon =
    type === "success" ? (
      <CheckCircle2 size={18} />
    ) : type === "error" ? (
      <AlertCircle size={18} />
    ) : (
      <Info size={18} />
    );

  return (
    <div className={`lf-feedback-banner ${type}`} role="alert" aria-live="polite">
      <div className="lf-feedback-icon">{icon}</div>
      <div className="lf-feedback-content">
        {title && <strong>{title}</strong>}
        <p>{message}</p>
        {children}
      </div>
      {actionText && onAction && (
        <button type="button" className="lf-feedback-action" onClick={onAction}>
          {actionText}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          className="lf-feedback-close"
          onClick={onClose}
          aria-label="Dismiss banner"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
