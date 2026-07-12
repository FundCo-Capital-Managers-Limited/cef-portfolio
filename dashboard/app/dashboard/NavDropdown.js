'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Boxes, Workflow, ShieldCheck, Layers, Landmark, Users, ClipboardList, Code2, ChevronDown,
} from 'lucide-react';

// Mirrors the icon keys used in layout.js/MobileMenu.js — kept as a separate
// map here too since function props can't cross the server/client boundary.
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

// Dropdown opens on hover (desktop) with a short close delay so moving the
// mouse from the trigger into the panel doesn't close it, and toggles on
// click/keyboard so it's usable without a mouse too.
export default function NavDropdown({ label, icon: GroupIcon, items }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

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
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue transition-colors whitespace-nowrap"
      >
        {GroupIcon && <GroupIcon size={15} className="shrink-0" />}
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px]">
            {items.map((item) => {
              const Icon = NAV_ICONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-brand-blue transition-colors"
                >
                  {Icon && <Icon size={15} className="shrink-0" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
