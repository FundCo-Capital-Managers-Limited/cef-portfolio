import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUserProfile } from '../../lib/data';
import SignOutButton from './SignOutButton';
import NotificationBell from './NotificationBell';

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1 bg-brand-gradient" />
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={140} height={32} priority />
            </Link>
            <Link href="/dashboard/registry" className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
              Asset Registry
            </Link>
            <Link href="/dashboard/pipeline" className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
              Pipeline Board
            </Link>
            <Link href="/dashboard/dreef" className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
              DREEF Pipeline
            </Link>
            <Link href="/dashboard/series" className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
              CEF Series
            </Link>
            {['it_admin', 'management'].includes(profile?.role) && (
              <Link href="/dashboard/admin/users" className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
                Users
              </Link>
            )}
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
