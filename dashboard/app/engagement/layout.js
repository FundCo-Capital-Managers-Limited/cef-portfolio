import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '../../lib/data';
import { canAccessIc, canAccessPip } from '../../lib/icAccess';
import ThemeToggle from '../dashboard/ThemeToggle';
import UserMenu from '../dashboard/UserMenu';
import NotificationBell from '../dashboard/NotificationBell';

// middleware.js already redirects anyone without IC access away from
// /engagement — this is the same defense-in-depth pattern used for
// assetco_dev/dev-console (the one enforcement point can't be the only one,
// in case a future change ever bypasses middleware for part of this tree).
export default async function EngagementLayout({ children }) {
  const profile = await getCurrentUserProfile();
  if (!canAccessIc(profile)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-1 bg-brand-gradient" />
      <header className="bg-white border-b border-gray-200 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/engagement" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={140} height={32} priority />
            </Link>
            <span className="hidden sm:inline text-sm font-medium text-gray-500 dark:text-gray-400">
              IC Engagement
            </span>
          </div>
          <div className="flex items-center gap-2 xl:gap-4 text-sm text-gray-600 shrink-0">
            {canAccessPip(profile) && (
              <Link href="/dashboard" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue transition-colors whitespace-nowrap">
                Portfolio Dashboard
              </Link>
            )}
            <ThemeToggle />
            <NotificationBell userId={profile?.id} />
            <UserMenu name={profile?.name} email={profile?.email} role={profile?.role} canAccessIc />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
