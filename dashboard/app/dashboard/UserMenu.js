'use client';

import { useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserCircle, ChevronDown, LogOut, ArrowLeftRight } from 'lucide-react';
import { createClient } from '../../lib/supabaseClient';

// Same hover/click dropdown pattern as NavDropdown, applied to the
// profile/sign-out corner — collapses "email + role text + Sign out link"
// into one control instead of three separate items competing for header
// space at every breakpoint. Shared between the PIP dashboard and the IC
// Engagement portal — canAccessIc controls whether the portal-switch link
// appears at all, so a PIP-only account never sees a link to a page
// middleware would just bounce them back from.
export default function UserMenu({ name, email, role, canAccessIc = false }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const inEngagement = pathname?.startsWith('/engagement');

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-brand-blue transition-colors"
      >
        <UserCircle size={22} />
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[220px]">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{name || email}</p>
              {name && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>}
              {role && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role.replace(/_/g, ' ')}</p>}
            </div>
            {canAccessIc && !inEngagement && (
              <Link
                href="/engagement"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-brand-blue transition-colors"
              >
                <ArrowLeftRight size={15} />
                Switch to IC Engagement
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-brand-blue transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
