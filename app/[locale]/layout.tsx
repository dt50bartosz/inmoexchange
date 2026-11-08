import '../globals.css';
import '../site-theme.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import CookieBanner from '@/components/CookieBanner';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PublicOnly from '@/components/PublicOnly';
import SiteTheme from '@/components/site/SiteTheme';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Every public page title ends in " | Colabora MLS" (the panel and developer panel set their own). */
export const metadata: Metadata = {
  title: { template: '%s | Colabora MLS', default: 'Colabora MLS' },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} translate="no" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteTheme>
            <PublicOnly>
              <Navbar />
            </PublicOnly>

            <main className="flex-1">
              {children}
            </main>

            {/* toast.success / toast.error from every panel and admin page show here */}
            <Toaster />

            {/* On every page (panel and admin too) until the visitor chooses */}
            <CookieBanner />

            <PublicOnly>
              <Footer />
            </PublicOnly>
          </SiteTheme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}