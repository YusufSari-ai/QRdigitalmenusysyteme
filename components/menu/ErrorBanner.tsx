interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

// Error state shown on API failure with mandatory retry button (spec §5.3)
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <div className="error-banner__icon" aria-hidden="true">
        ⚠️
      </div>
      <div>
        <p className="error-banner__title">Something went wrong</p>
        <p className="error-banner__message">{message}</p>
      </div>
      <button className="error-banner__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
