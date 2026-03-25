import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenClaw Constellation | Agent Communication Logger',
  description: 'Real-time visualization of OpenClaw agent communications',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%231a1f36" rx="4"/><circle cx="16" cy="16" r="6" fill="%23a78bfa"/><circle cx="8" cy="8" r="2" fill="%2322c55e"/><circle cx="24" cy="10" r="2" fill="%233b82f6"/><circle cx="10" cy="24" r="2" fill="%23f97316"/><circle cx="24" cy="22" r="2" fill="%2322c55e"/></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}