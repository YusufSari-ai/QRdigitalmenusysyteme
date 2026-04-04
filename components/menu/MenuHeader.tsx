"use client";

import { useState } from "react";
import Image from "next/image";
import FeedbackModal from "./FeedbackModal";

// Inline SVG: chat bubble (Feather Icons, MIT)
function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function MenuHeader() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <header className="menu-header">
        {/* Left spacer — balances the right-side button so brand stays centered */}
        <div className="menu-header__side" aria-hidden="true" />

        {/* Center brand */}
        <div className="menu-header__brand">
          <Image
            src="/logo.png"
            alt="Tart Cafe logo"
            width={44}
            height={44}
            className="menu-header__brand-logo"
            priority
          />
          <span className="menu-header__logo">Tart Cafe</span>
        </div>

        {/* Right: feedback button */}
        <div className="menu-header__side menu-header__side--right">
          <button
            className="menu-header__feedback-btn"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Geri bildirim gönder"
          >
            <ChatIcon />
          </button>
        </div>
      </header>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
}
