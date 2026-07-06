import './globals.css';

export const metadata = {
  title: 'CEF-PIP Dashboard',
  description: 'CEF Portfolio Intelligence Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
