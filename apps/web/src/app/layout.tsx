import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './performance.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteTransitionMonitor } from '@/lib/performance';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'All-Verse GPT - AI Marketplace',
  description: 'A modern AI-powered marketplace for buying and selling with intelligent assistance.',
  keywords: ['AI', 'marketplace', 'GPT', 'buy', 'sell', 'intelligent'],
  authors: [{ name: 'All-Verse Team' }],
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  other: {
    'prefetch': '/api/listings?limit=6',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.variable} font-sans h-full dark`}>
        <div className="min-h-screen">
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <RouteTransitionMonitor />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
