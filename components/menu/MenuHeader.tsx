"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

// Inline SVG: left arrow chevron (Feather Icons, MIT)
function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

interface MenuHeaderProps {
  /** When provided, renders a back button in the top-left that navigates to this href. */
  backHref?: string;
}

export default function MenuHeader({ backHref }: MenuHeaderProps = {}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <header className="menu-header">
        {/* Left slot — back button when backHref is set, spacer otherwise */}
        <div className="menu-header__side">
          {backHref && (
            <button
              className="menu-header__feedback-btn"
              onClick={() => router.push(backHref)}
              aria-label="Back to menu"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        {/* Center brand */}
        <div className="menu-header__brand">
          <Image
            src="/logo.jpeg"
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
