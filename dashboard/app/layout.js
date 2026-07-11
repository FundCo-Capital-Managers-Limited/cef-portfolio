import './globals.css';

// CEF-PIP is an internal oversight tool, not a public marketing site — the
// whole app is noindex by default so it never turns up in search results.
// /apply is the one page meant to be shared externally (with prospective
// AssetCos), so its own layout overrides this back to indexable.
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'CEF-PIP',
    template: '%s · CEF-PIP',
  },
  description: 'CEF Portfolio Intelligence Platform — portfolio oversight for the Clean Energy Fund.',
  robots: { index: false, follow: false },
  icons: { icon: '/logo.png' },
};

// Runs before paint (inline, not a bundled script) so the page never flashes
// light-then-dark: reads the user's saved choice, falling back to their OS
// preference on first visit. Applies to every route, not just /dashboard, so
// public pages (login, apply) also respect the same choice/preference —
// suppressHydrationWarning on <html> because this script mutates its class
// before React hydrates, which React would otherwise flag as a mismatch.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('cef-pip-theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
