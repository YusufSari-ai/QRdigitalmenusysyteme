"use client";

import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Rating = "👍" | "😐" | "👎" | null;

export default function FeedbackModal({ open, onClose }: Props) {
  const [rating, setRating] = useState<Rating>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset form state after close animation finishes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setRating(null);
        setComment("");
        setSubmitted(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!rating) return;

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Gönderim başarısız.");
      }

      setSubmitted(true);
      setTimeout(() => onClose(), 1400);
    } catch (error) {
      console.error("Feedback submit error:", error);
      alert("Geri bildirim gönderilemedi.");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`feedback-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className={`feedback-sheet${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Geri bildirim"
      >
        {/* Drag handle */}
        <div className="feedback-sheet__handle" aria-hidden="true" />

        {submitted ? (
          /* ── Success state ── */
          <div className="feedback-thanks">
            <div className="feedback-thanks__check">✓</div>
            <p className="feedback-thanks__text">Teşekkürler!</p>
            <p className="feedback-thanks__sub">Geri bildiriminiz alındı.</p>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <h2 className="feedback-sheet__title">Bizi değerlendir</h2>

            {/* Emoji rating */}
            <div className="feedback-ratings" role="group" aria-label="Puanınız">
              {(["👍", "😐", "👎"] as const).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`feedback-rating-btn${rating === emoji ? " selected" : ""}`}
                  onClick={() => setRating((prev) => (prev === emoji ? null : emoji))}
                  aria-pressed={rating === emoji}
                >
                  <span className="feedback-rating-btn__emoji">{emoji}</span>
                </button>
              ))}
            </div>

            {/* Optional comment */}
            <textarea
              className="feedback-textarea"
              placeholder="Yorumunuz (isteğe bağlı)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />

            {/* Actions */}
            <div className="feedback-actions">
              <button type="button" className="feedback-cancel" onClick={onClose}>
                Vazgeç
              </button>
              <button
                type="button"
                className="feedback-submit"
                onClick={handleSubmit}
                disabled={rating === null}
              >
                Gönder
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
