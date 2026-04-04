"use client";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="dialog-box">
        <div className="dialog-box__icon" aria-hidden="true">
          {danger ? "🗑️" : "ℹ️"}
        </div>
        <h2 className="dialog-box__title" id="dialog-title">
          {title}
        </h2>
        <p className="dialog-box__message" id="dialog-message">
          {message}
        </p>
        <div className="dialog-box__actions">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            id="dialog-cancel-btn"
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            id="dialog-confirm-btn"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
