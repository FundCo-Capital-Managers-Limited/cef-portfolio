import Link from 'next/link';
import { getCurrentUserProfile } from '../../lib/data';
import SignOutButton from './SignOutButton';

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-lg">
            CEF-PIP
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-600">
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
