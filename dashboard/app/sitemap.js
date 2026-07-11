// Only /apply is meant to be publicly discoverable — everything else in
// this app is either an internal dashboard behind auth or a sign-in page,
// neither of which belongs in a sitemap.
export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return [
    {
      url: `${siteUrl}/apply`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
