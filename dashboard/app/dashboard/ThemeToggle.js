'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('cef-pip-theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-lg leading-none px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
