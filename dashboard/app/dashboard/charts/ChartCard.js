// Wraps every chart with a title + one-sentence explanation of what it shows
// and why it matters, and a consistent empty state when there's no data yet
// — per feedback, a chart with nothing to plot should still say what it's
// for rather than just vanishing.
export default function ChartCard({ title, description, isEmpty, emptyHint, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium text-brand-navy">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      {isEmpty ? (
        <div className="h-48 flex items-center justify-center text-center px-4">
          <p className="text-sm text-gray-400">{emptyHint || 'No data to plot yet.'}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
