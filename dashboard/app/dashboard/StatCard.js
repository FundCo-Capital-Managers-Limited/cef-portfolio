const ICON_TONE_STYLES = {
  blue: 'bg-blue-50 text-brand-blue dark:bg-blue-500/10',
  green: 'bg-green-50 text-brand-green dark:bg-green-500/10',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10',
  navy: 'bg-indigo-50 text-brand-navy dark:bg-indigo-500/10',
};

export default function StatCard({ label, value, tone, Icon, iconTone = 'blue' }) {
  return (
    <div className="group bg-white rounded-lg border border-gray-200 border-t-4 border-t-brand-blue p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {Icon && (
          <span className={`shrink-0 rounded-full p-1.5 ${ICON_TONE_STYLES[iconTone] || ICON_TONE_STYLES.blue}`}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className={`text-2xl font-semibold mt-1 ${tone || 'text-brand-navy dark:text-white'}`}>{value}</p>
    </div>
  );
}
