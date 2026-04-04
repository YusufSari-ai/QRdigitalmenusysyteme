interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: string;
}

// Shown when no categories exist (spec §8)
export default function EmptyState({
  title = "The menu is empty",
  subtitle = "No items are available at the moment. Please check back later.",
  icon = "🍽️",
}: EmptyStateProps) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__subtitle">{subtitle}</p>
    </div>
  );
}
