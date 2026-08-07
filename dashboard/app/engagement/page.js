import Link from 'next/link';
import IcDashboardSummary from './IcDashboardSummary';

export default function EngagementHomePage() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-brand-navy dark:text-gray-100 mb-2">IC Engagement</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The matter register, meetings, committee roster, voting, conditions/actions, minutes, and email correspondence are all live.
        </p>
      </div>

      <IcDashboardSummary />

      <div className="grid sm:grid-cols-5 gap-4">
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
        <Link
          href="/engagement/secretariat"
          className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
        >
          <h2 className="font-semibold text-sm">Secretariat</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Every open condition/action and every meeting still needing its minutes locked, in one place.
          </p>
        </Link>
        <Link
          href="/engagement/email"
          className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
        >
          <h2 className="font-semibold text-sm">Email</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Send correspondence to sponsors, counsel, or other external parties.
          </p>
        </Link>
      </div>
    </div>
  );
}
