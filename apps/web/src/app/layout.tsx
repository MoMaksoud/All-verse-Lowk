import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './performance.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'All-Verse GPT - AI Marketplace',
  description: 'A modern AI-powered marketplace for buying and selling with intelligent assistance.',
  keywords: ['AI', 'marketplace', 'GPT', 'buy', 'sell', 'intelligent'],
  authors: [{ name: 'All-Verse Team' }],
  viewport: 'width=device-width, initial-scale=1',
  other: {
    'prefetch': '/api/listings?limit=6',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} h-full dark`}>
        <div className="min-h-screen">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        </div>
      </body>
    </html>
  );
}
