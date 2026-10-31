import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, Kalam, Manrope } from "next/font/google";
import { CheckCircleIcon as CheckCircle, InfoIcon as Info, SpinnerGapIcon as SpinnerGap, WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Toaster } from "sonner";
import "./globals.css";
import LiveToasts from "./live-toasts";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: "400" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Call once with the job, your address and your price. Sorted, a Vaani voice agent, rings local plumbers, electricians and AC mechanics, bargains in their language, and calls you back with whoever agreed.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Sorted: one call, and it's sorted", template: "%s · Sorted" },
  description,
  applicationName: "Sorted",
  keywords: ["home services", "plumber", "electrician", "AC repair", "voice agent", "Vaani", "Bengaluru", "get quotes", "book a repair"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Sorted", locale: "en_IN", title: "Sorted: one call, and it's sorted", description },
  twitter: { card: "summary_large_image", title: "Sorted: one call, and it's sorted", description },
  robots: { index: true, follow: true },
  category: "home services",
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${archivo.variable} ${instrument.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {children}
        <LiveToasts />
        <Toaster
          position="top-center"
          icons={{
            success: <CheckCircle className="size-5 text-safe" weight="fill" />,
            error: <WarningCircle className="size-5 text-scam" weight="fill" />,
            loading: <SpinnerGap className="size-5 animate-spin text-bronze" />,
            warning: <WarningCircle className="size-5 text-pending" weight="fill" />,
            info: <Info className="size-5 text-family" weight="fill" />,
          }}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-line bg-paper p-4 font-sans text-ink shadow-[0_16px_40px_-16px_#1a1f2459]",
              title: "font-semibold",
              description: "mt-0.5 text-sm text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
