// The whole app already sets robots: noindex at the layout level (belt and
// suspenders isn't needed for meta robots vs robots.txt, but crawlers that
// only check robots.txt before ever requesting a page still need this) —
// /apply is the only route worth letting a crawler reach at all.
export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/apply'],
        disallow: ['/dashboard', '/login', '/reset-password'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
