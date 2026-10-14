import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers/Providers";
import { brand } from "@/config";
import { siteUrl } from "@/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brand.name}: ${brand.tagline}`, template: `%s | ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: "en_GH",
    title: brand.name,
    description: brand.description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description: brand.description },
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        {/* Chrome can offer installation before React is ready; keep that event so the Install button still works. */}
        <Script id="capture-install-prompt" strategy="beforeInteractive">
          {"window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;});"}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
