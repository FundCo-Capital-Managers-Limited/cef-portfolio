import Link from 'next/link';
import { getCurrentUserProfile } from '../../lib/data';
import SignOutButton from './SignOutButton';
import NotificationBell from './NotificationBell';

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-lg">
              CEF-PIP
            </Link>
            <Link href="/dashboard/registry" className="text-sm text-gray-600 hover:text-gray-900">
              Asset Registry
            </Link>
            <Link href="/dashboard/pipeline" className="text-sm text-gray-600 hover:text-gray-900">
              Pipeline Board
            </Link>
            <Link href="/dashboard/dreef" className="text-sm text-gray-600 hover:text-gray-900">
              DREEF Pipeline
            </Link>
            <Link href="/dashboard/series" className="text-sm text-gray-600 hover:text-gray-900">
              CEF Series
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <NotificationBell userId={profile?.id} />
            <span>
              {profile?.email} {profile?.role ? `· ${profile.role}` : ''}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
