import './globals.css';

export const metadata = {
  title: 'Claw Comms Logger - Constellation',
  description: 'Communication logger constellation visualization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0c14] text-[#e2e8f0] antialiased">
        {children}
      </body>
    </html>
  );
}