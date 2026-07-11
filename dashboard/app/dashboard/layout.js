import Link from 'next/link';
import Image from 'next/image';
import { Boxes, Workflow, ShieldCheck, Layers, Landmark, Users, ClipboardList, Code2 } from 'lucide-react';
import { getCurrentUserProfile } from '../../lib/data';
import SignOutButton from './SignOutButton';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import MobileMenu from './MobileMenu';

// Rendered directly here (a Server Component) for the desktop nav — kept out
// of the navLinks array passed to MobileMenu since function props (icon
// components included) can't cross the server/client boundary; MobileMenu
// keeps its own copy of this same mapping.
const NAV_ICONS = {
  '/dashboard/registry': Boxes,
  '/dashboard/pipeline': Workflow,
  '/dashboard/dreef': ShieldCheck,
  '/dashboard/series': Layers,
  '/dashboard/loan-book': Landmark,
  '/dashboard/admin/users': Users,
  '/dashboard/admin/applications': ClipboardList,
  '/dashboard/dev-console': Code2,
};

export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();
  const isAssetcoDev = profile?.role === 'assetco_dev';

  // assetco_dev is confined to the Developer Console by middleware.js (that's
  // the real enforcement — RLS here can't scope by role); this just keeps
  // their nav from showing links to pages they'd get redirected away from.
  const navLinks = isAssetcoDev
    ? [{ href: '/dashboard/dev-console', label: 'Developer Console' }]
    : [
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={isAssetcoDev ? '/dashboard/dev-console' : '/dashboard'} className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={140} height={32} priority />
            </Link>
            {/* 7 possible links is too wide for md (768px) alongside the logo and the
                right-side icon cluster — that combination used to overflow/overlap.
                Only shown at lg+ (1024px), with its own overflow-x-auto as a safety
                net for anything narrower than the full link set needs. */}
            <nav className="hidden lg:flex items-center gap-4 overflow-x-auto min-w-0">
              {navLinks.map((link) => {
                const Icon = NAV_ICONS[link.href];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-blue transition-colors whitespace-nowrap shrink-0"
                  >
                    {Icon && <Icon size={15} className="shrink-0" />}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 xl:gap-4 text-sm text-gray-600 shrink-0">
            <ThemeToggle />
            {/* audit_log RLS is is_cef_user()-broad (any provisioned user, no
                per-role scoping) — hiding this for assetco_dev is UX, not the
                real boundary, but there's no reason to show them CEF-wide
                change history regardless. */}
            {!isAssetcoDev && <NotificationBell userId={profile?.id} />}
            <span className="hidden xl:inline whitespace-nowrap">
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
