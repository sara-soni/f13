import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { removeToast } from "../../features/toast/toastSlice";
import type { ToastMessage } from "../../features/toast/toastSlice";

export default function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.toast.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="lf-toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dispatch(removeToast(toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.durationMs ?? 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  const icon = (() => {
    switch (toast.type) {
      case "success":
        return <CheckCircle2 size={18} />;
      case "warning":
        return <AlertTriangle size={18} />;
      case "error":
        return <AlertCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  })();

  return (
    <div className={`lf-toast lf-toast-${toast.type}`} role="status">
      <div className="lf-toast-icon">{icon}</div>
      <div className="lf-toast-content">
        {toast.title && <strong className="lf-toast-title">{toast.title}</strong>}
        <p className="lf-toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="lf-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
