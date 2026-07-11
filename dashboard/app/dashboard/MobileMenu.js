'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="text-xl leading-none px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-40">
          <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
