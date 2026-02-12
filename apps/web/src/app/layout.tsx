import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import './performance.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteTransitionMonitor } from '@/lib/performance';

const GA_MEASUREMENT_ID = 'G-1KVRME8D19';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://allversegpt.com'),
  title: 'AllVerse GPT | Price, list, and sell your stuff faster with AI.',
  description: 'AI platform for smart item search, live negotiation, and simple buying & selling in one place',
  keywords: ['AI', 'marketplace', 'GPT', 'buy', 'sell', 'intelligent'],
  authors: [{ name: 'All-Verse Team' }],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  // No themeColor - let status bar be transparent by default
  appleWebApp: {
    title: 'AllVerse GPT | Price, list, and sell your stuff faster with AI.',
  },
  openGraph: {
    title: 'AllVerse GPT | Price, list, and sell your stuff faster with AI.',
    description: 'AI platform for smart item search, live negotiation, and simple buying & selling in one place',
    url: 'https://allversegpt.com',
    siteName: 'AllVerse GPT',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'AllVerse GPT AI Marketplace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AllVerse GPT | Price, list, and sell your stuff faster with AI.',
    description: 'AI platform for smart item search, live negotiation, and simple buying & selling in one place',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'dark', // Tell browser it's a dark site, but no specific color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Explicitly set transparent theme-color for mobile browsers */}
        <meta name="color-scheme" content="dark" />
        {/* Google Analytics (GA4) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans h-full overflow-x-hidden`} suppressHydrationWarning>
        <div className="min-h-screen w-full max-w-screen overflow-x-hidden">
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <ChatProvider>
                  <RouteTransitionMonitor />
                  {children}
                </ChatProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
