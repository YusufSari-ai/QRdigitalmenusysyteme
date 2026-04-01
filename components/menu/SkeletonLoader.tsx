// Win2000-styled skeleton loader shown while menu data loads (spec §5.2 — CLS = 0)
export default function SkeletonLoader() {
  return (
    <>
      {/* Win2000 tab-style nav skeleton */}
      <div className="skeleton-nav" aria-hidden="true">
        {[90, 70, 110, 80, 95].map((w, i) => (
          <div
            key={i}
            className="skeleton skeleton-nav__pill"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Two category sections */}
      {[1, 2].map((s) => (
        <div key={s} className="skeleton-section" aria-hidden="true">
          <div className="skeleton skeleton-section__header" />
          <div className="skeleton-grid">
            {[1, 2, 3, 4].map((c) => (
              <div key={c} className="skeleton-card">
                <div className="skeleton skeleton-card__name" />
                <div className="skeleton skeleton-card__image" />
                <div className="skeleton skeleton-card__price" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
