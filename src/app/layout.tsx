import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Second Brain',
  description: 'Personal knowledge capture system via SMS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.className} antialiased`}>
        <div className="min-h-screen flex">
          <Navigation />
          <main className="flex-1 p-6 lg:p-8 lg:ml-0 mt-14 lg:mt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
