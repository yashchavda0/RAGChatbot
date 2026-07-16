import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
// A plain relative import (not the package's "./styles.css" export) — Next.js's
// webpack CSS pipeline doesn't reliably resolve subpath `exports` for symlinked
// npm-workspace packages, so this sidesteps that instead of fighting it.
import '../../../packages/shared-ui/src/styles.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'RAG Chatbot - Multi-Agent AI System',
    template: '%s | RAG Chatbot',
  },
  description: 'Intelligent RAG chatbot with agent orchestration, document search, web search, and OCR capabilities',
  keywords: ['AI', 'Chatbot', 'RAG', 'LangGraph', 'Document Search', 'Multi-Agent'],
  authors: [{ name: 'RAG Chatbot Team' }],
  creator: 'RAG Chatbot',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'RAG Chatbot - Multi-Agent AI System',
    description: 'Intelligent RAG chatbot with agent orchestration, document search, web search, and OCR capabilities',
    siteName: 'RAG Chatbot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RAG Chatbot - Multi-Agent AI System',
    description: 'Intelligent RAG chatbot with agent orchestration, document search, web search, and OCR capabilities',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RAG Chatbot',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
