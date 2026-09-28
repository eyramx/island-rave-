import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Island Rave — La Plage',
  description: 'Ticketing and event information for Island Rave at La Plage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-black text-white min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
