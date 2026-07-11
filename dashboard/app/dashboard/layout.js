import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUserProfile } from '../../lib/data';
import SignOutButton from './SignOutButton';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import MobileMenu from './MobileMenu';

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();

  const navLinks = [
    { href: '/dashboard/registry', label: 'Asset Registry' },
    { href: '/dashboard/pipeline', label: 'Pipeline Board' },
    { href: '/dashboard/dreef', label: 'DREEF Pipeline' },
    { href: '/dashboard/series', label: 'CEF Series' },
    { href: '/dashboard/loan-book', label: 'Loan Book' },
    ...(['it_admin', 'management'].includes(profile?.role)
      ? [{ href: '/dashboard/admin/users', label: 'Users' }]
      : []),
    ...(['executive', 'management', 'it_admin'].includes(profile?.role)
      ? [{ href: '/dashboard/admin/applications', label: 'Applications' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-1 bg-brand-gradient" />
      <header className="bg-white border-b border-gray-200 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={140} height={32} priority />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-brand-blue transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-gray-600">
            <ThemeToggle />
            <NotificationBell userId={profile?.id} />
            <span className="hidden lg:inline">
              {profile?.email} {profile?.role ? `· ${profile.role}` : ''}
            </span>
            <SignOutButton />
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
