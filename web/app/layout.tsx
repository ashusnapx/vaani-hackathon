import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Kalam, Manrope } from "next/font/google";
import { CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: "400" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Sorted — one call, and it's sorted",
  description: "Call once with the job and your price. Sorted rings local service people, bargains, and calls you back with whoever agreed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${archivo.variable} ${instrument.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {children}
        <Toaster
          position="top-center"
          icons={{
            success: <CheckCircle className="size-5 text-safe" weight="fill" />,
            error: <WarningCircle className="size-5 text-scam" weight="fill" />,
            loading: <SpinnerGap className="size-5 animate-spin text-bronze" />,
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
