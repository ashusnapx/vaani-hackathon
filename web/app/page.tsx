import { ReactLenis } from "lenis/react";
import { HandCoinsIcon as HandCoins, PhoneIncomingIcon as PhoneIncoming, PhoneOutgoingIcon as PhoneOutgoing } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import BeforeAfter from "./before-after";
import CallMe from "./call-me";
import Features from "./features";
import HeroArt from "./hero-art";
import Services from "./services";
import { PencilRing } from "./sketch";
import { RING } from "./sketch-art";


const SOURCES = [
  ["HDFC Sky, Urban Company RHP key details", "https://hdfcsky.com/news/urban-company-ipo-opens-on-september-10-key-details-and-risks-from-rhp"],
  ["Finology, Urban Company analysis", "https://recipe.finology.in/discover/premium-stock-research/urban-company-fundamental-analysis"],
  ["Outlook Business, Redseer online home services report", "https://www.outlookbusiness.com/news/indias-online-home-services-market-to-grow-at-22-to-hit-88-billion-by-fy30-report"],
] as const;

const flow = [
  [PhoneIncoming, "You call once", "Say the job, your address and what you want to pay. In English or your own language."],
  [PhoneOutgoing, "Sorted rings around", "It phones the local service people, asks each for a price and bargains towards yours."],
  [HandCoins, "You get a yes", "Sorted calls back with whoever agreed, the best one first and a backup, and their number."],
] as const;

// What Sorted is, for search engines that read structured data.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Sorted",
  serviceType: "Home repair booking by phone",
  description: "Call once with the job and your price. Sorted rings local service people, bargains, and calls you back with whoever agreed.",
  areaServed: { "@type": "Country", name: "India" },
  availableChannel: { "@type": "ServiceChannel", servicePhone: { "@type": "ContactPoint", telephone: "+91-80642-79097", contactType: "customer service",
    availableLanguage: ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia"] } },
  provider: { "@type": "Organization", name: "Sorted" },
};

export default function Home() {
  return (
    <ReactLenis root>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[96rem] px-4 sm:px-8">

        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <h1 className="font-serif text-[clamp(3rem,7vw,5.75rem)] leading-[0.92] tracking-[-0.02em] text-balance">
              One call,
              <br />
              and it&rsquo;s <PencilRing paths={RING}><em className="text-bronze">sorted.</em></PencilRing>
            </h1>
            <p className="mt-6 text-xl text-muted">You call once. We ring the repairmen and haggle.</p>

            <div className="relative mt-10 max-w-[34rem]">
              <div className="pointer-events-none absolute -top-11 right-2 flex items-end gap-1 text-bronze" aria-hidden>
                <span className="font-serif text-xl italic">try it</span>
                <svg width="44" height="40" viewBox="0 0 44 40" fill="none" className="translate-y-5">
                  <path d="M40 4 C 30 6, 18 14, 14 32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M8 26 L14 33 L20 27" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <CallMe />
            </div>
          </div>
          <HeroArt />
        </section>

        <ol className="grid border-y border-line md:grid-cols-3">
          {flow.map(([Icon, title, body], i) => (
            <li key={title} className={`py-6 md:px-6 ${i ? "border-t border-line md:border-t-0 md:border-l" : "md:pl-0"}`}>
              <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-bronze">
                <Icon className="size-5" weight="duotone" aria-hidden />
              </span>
              <p className="mt-4 font-serif text-2xl">{title}</p>
              <p className="mt-2 max-w-[36ch] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>

        <BeforeAfter />

        <Features />

        <Services />


        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-8 text-sm text-muted">
          <a
            href="https://www.vaani.dev"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-full border border-line bg-paper/80 py-1.5 pr-4 pl-1.5 transition hover:border-ink"
          >
            <Image src="/vaani-logo.png" alt="" width={32} height={29} className="transition group-hover:rotate-[-8deg]" />
            <span>
              Built on <span className="font-semibold text-ink">Vaani AI</span> for the Vaani Agent Buildathon, 31 Oct 2026
            </span>
          </a>
          <span>Pay the service person directly. Never share an OTP on a call.</span>
          <p className="w-full border-t border-line pt-4 text-xs leading-relaxed">
            Sources: market size ($60B, FY25), unorganised share (90.5%, FY25) and online share (under 1%) are
            Redseer figures as cited in coverage of Urban Company&rsquo;s 2025 IPO filing:{" "}
            {SOURCES.map(([label, href], i) => (
              <span key={href}>
                <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">{label}</a>
                {i < SOURCES.length - 1 ? ", " : "."}
              </span>
            ))}{" "}
            Before-and-after figures describe Sorted&rsquo;s own flow for one job priced by three mechanics.
          </p>
        </footer>
      </div>
    </ReactLenis>
  );
}
