export function RootLoader() {
  return (
    <div
      className="root-loader fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-(--bg)"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-6">
        <p className="font-semibold text-[18px] tracking-tight text-(--text)">
          Flowboard
        </p>
        <div className="flex gap-1" role="presentation">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="root-loader-bar h-1 w-2 rounded-full bg-(--accent)"
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2" role="presentation">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="root-loader-dot h-2 w-2 rounded-full bg-(--text-muted)"
          />
        ))}
      </div>
    </div>
  );
}
