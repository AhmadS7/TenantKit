import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import StoreInitializer from './initializer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cortex - Production Grade Multi-Tenant SaaS Boilerplate',
  description: 'A robust, multi-tenant boilerplate built with Next.js 15, NestJS, PostgreSQL RLS, and Stripe.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-[#0a0a0a] text-slate-100 min-h-screen`}
      >
        <Providers>
          <StoreInitializer>
            {children}
          </StoreInitializer>
        </Providers>
      </body>
    </html>
  );
}
