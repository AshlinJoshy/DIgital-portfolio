import type { Metadata } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { TopNav } from '@/components/nav';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Convergence · Marketing Intelligence',
  description:
    'A unified marketing intelligence dashboard for multi-channel consumer brands — Google, Meta, TikTok, LinkedIn, PostHog, GA4, CRM. Markov attribution, customer scoring, and journey analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} font-sans min-h-screen`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider delayDuration={200}>
            <TopNav />
            <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">{children}</main>
            <footer className="border-t border-border/60 mt-16 py-8">
              <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Convergence</span> · a portfolio
                  marketing intelligence dashboard
                </div>
                <div className="tabular">
                  Data is simulated. In production this stack would ingest from Google Ads, Meta,
                  TikTok, LinkedIn, Snapchat, PostHog, GA4, and a CRM warehouse.
                </div>
              </div>
            </footer>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
