'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Boxes, Workflow, ShieldCheck, Layers, Landmark, Users, ClipboardList, Code2, Menu, X } from 'lucide-react';

// Mirrors the NAV_ICONS map in layout.js — kept separate because a Server
// Component (layout.js) can't pass function props (icon components
// included) to a Client Component like this one.
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

export default function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-40">
          <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {links.map((link, i) => {
              const Icon = NAV_ICONS[link.href];
              const showSection = link.section && link.section !== links[i - 1]?.section;
              return (
                <div key={link.href}>
                  {showSection && (
                    <div className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {link.section}
                    </div>
                  )}
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    {Icon && <Icon size={16} />}
                    {link.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
