import Link from 'next/link';
import Image from 'next/image';
import { Boxes } from 'lucide-react';
import { getCurrentUserProfile } from '../../lib/data';
import { canAccessIc } from '../../lib/icAccess';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import MobileMenu from './MobileMenu';
import NavDropdown from './NavDropdown';
import UserMenu from './UserMenu';

// Rendered directly here (a Server Component) for the desktop nav — kept out
// of the navLinks array passed to MobileMenu since function props (icon
// components included) can't cross the server/client boundary; MobileMenu
// keeps its own copy of this same mapping.
const NAV_ICONS = {
  '/dashboard/registry': Boxes,
};

// Grouped into dropdowns (Pipelines / Funding / Admin) instead of one long
// flat row — a flat row of 7+ links used to overflow/overlap even at large
// desktop widths (or need a horizontal-scroll workaround, which reads as
// broken rather than intentional). Group icons are passed as name strings
// (not components) since this is a Server Component handing props to the
// Client Component NavDropdown, which resolves the name against its own map.
export default async function DashboardLayout({ children }) {
  const profile = await getCurrentUserProfile();
  const isAssetcoDev = profile?.role === 'assetco_dev';

  // assetco_dev is confined to the Developer Console by middleware.js (that's
  // the real enforcement — RLS here can't scope by role); this just keeps
  // their nav from showing links to pages they'd get redirected away from.
  const navGroups = isAssetcoDev
    ? [{ href: '/dashboard/dev-console', label: 'Developer Console' }]
    : [
        { href: '/dashboard/registry', label: 'AssetCo Registry' },
        ...(profile?.role !== 'assetco_admin' ? [{ href: '/dashboard/flags', label: 'Flags' }] : []),
        ...(profile?.role !== 'assetco_admin' ? [{ href: '/dashboard/approvals', label: 'Approvals' }] : []),
        {
          label: 'Pipelines',
          icon: 'Workflow',
          items: [
            { href: '/dashboard/pipeline', label: 'Pipeline Board' },
            { href: '/dashboard/dreef', label: 'DREEF Pipeline' },
          ],
        },
        {
          label: 'Funding',
          icon: 'Landmark',
          items: [
            { href: '/dashboard/series', label: 'CEF Series' },
            { href: '/dashboard/loan-book', label: 'Loan Book' },
          ],
        },
        ...(['it_admin', 'management', 'executive'].includes(profile?.role)
          ? [
              {
                label: 'Admin',
                icon: 'Users',
                items: [
                  ...(['it_admin', 'management'].includes(profile?.role)
                    ? [{ href: '/dashboard/admin/users', label: 'Users' }]
                    : []),
                  ...(['executive', 'management', 'it_admin'].includes(profile?.role)
                    ? [{ href: '/dashboard/admin/applications', label: 'Applications' }]
                    : []),
                ],
              },
            ]
          : []),
      ];

  // Flattened form for MobileMenu, which lists everything vertically with
  // section headers rather than nested dropdowns (hover doesn't apply on
  // touch, and a vertical list has no overlap problem to begin with).
  const navLinks = navGroups.flatMap((g) => (g.items ? g.items.map((i) => ({ ...i, section: g.label })) : [g]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-1 bg-brand-gradient" />
      <header className="bg-white border-b border-gray-200 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={isAssetcoDev ? '/dashboard/dev-console' : '/dashboard'} className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={140} height={32} priority />
            </Link>
            {/* Related pages are grouped into hover dropdowns (Pipelines, Funding,
                Admin) instead of one long flat row — keeps the top-level count low
                enough that nothing overlaps or needs a horizontal-scroll workaround,
                even alongside the logo and the right-side icon cluster. */}
            <nav className="hidden lg:flex items-center gap-5">
              {navGroups.map((group) => {
                if (group.items) {
                  return <NavDropdown key={group.label} label={group.label} icon={group.icon} items={group.items} />;
                }
                const Icon = NAV_ICONS[group.href];
                return (
                  <Link
                    key={group.href}
                    href={group.href}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-blue transition-colors whitespace-nowrap shrink-0"
                  >
                    {Icon && <Icon size={15} className="shrink-0" />}
                    {group.label}
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
            <UserMenu name={profile?.name} email={profile?.email} role={profile?.role} canAccessIc={canAccessIc(profile)} />
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
