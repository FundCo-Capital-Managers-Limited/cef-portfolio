import Link from 'next/link';

export default function EngagementHomePage() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-brand-navy dark:text-gray-100 mb-2">IC Engagement</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Voting, conditions/actions, and email correspondence are on the way. The matter register, meetings, and committee roster are live.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/engagement/matters"
          className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
        >
          <h2 className="font-semibold text-sm">Matter Register</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            New investments, disbursements, portfolio management, problem assets, exits, and policy matters.
          </p>
        </Link>
        <Link
          href="/engagement/meetings"
          className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
        >
          <h2 className="font-semibold text-sm">Meetings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Schedule IC meetings and build the agenda from open matters.
          </p>
        </Link>
        <Link
          href="/engagement/committee"
          className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
        >
          <h2 className="font-semibold text-sm">Committee Roster</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Who's currently on the IC, and who holds Chair/Secretary.
          </p>
        </Link>
      </div>
    </div>
  );
}
