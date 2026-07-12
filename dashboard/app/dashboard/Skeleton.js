// Generic loading skeleton shown instantly on navigation (Next.js renders the
// nearest loading.js immediately, before the destination page's data fetch
// resolves) — this is what fixes "did my click register?" on slower
// Server-Component pages.
export default function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            {Array.from({ length: rows }).map((__, j) => (
              <div key={j} className="h-3 bg-gray-100 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
