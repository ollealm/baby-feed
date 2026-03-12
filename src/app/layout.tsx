import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { AppProvider } from "@/lib/context";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Baby Feed",
  description: "Track baby formula feedings",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baby Feed",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.className} antialiased bg-background dark:bg-dark-bg text-foreground dark:text-dark-foreground`}>
        <ThemeProvider>
          <AppProvider>
            <main className="max-w-md mx-auto px-4 pb-8">
              {children}
            </main>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
