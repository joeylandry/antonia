import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const newsreader = localFont({
  src: "./fonts/Newsreader-Variable.woff2",
  variable: "--font-newsreader",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: { default: "FitnessTracker", template: "%s · FitnessTracker" },
  description: "Client management and progress tracking for personal trainers.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0e111e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${newsreader.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors={false} closeButton toastOptions={{ classNames: { toast: "!bg-surface-raised !text-foreground !border-border" } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
