// The one page in this app meant to be shared externally with prospective
// AssetCos — overrides the root layout's default noindex, and adds Open
// Graph tags so a link shared in Slack/email/WhatsApp renders a proper
// preview card instead of a bare URL.
export const metadata = {
  title: 'AssetCo Onboarding Application',
  description:
    'Apply to partner with the Clean Energy Fund as an AssetCo. Tell us about your company and our team will review your application.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'AssetCo Onboarding Application: Clean Energy Fund',
    description:
      'Apply to partner with the Clean Energy Fund as an AssetCo. Tell us about your company and our team will review your application.',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function ApplyLayout({ children }) {
  return children;
}
