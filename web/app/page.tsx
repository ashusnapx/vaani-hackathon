import { ReactLenis } from "lenis/react";
import { HandCoins, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import BeforeAfter from "./before-after";
import CallMe from "./call-me";
import Features from "./features";
import HeroArt from "./hero-art";
import Services from "./services";
import { PencilRing } from "./sketch";
import { RING } from "./sketch-art";

const number = process.env.NEXT_PUBLIC_SORTED_NUMBER || "+91 80642 79097";

const SOURCES = [
  ["HDFC Sky, Urban Company RHP key details", "https://hdfcsky.com/news/urban-company-ipo-opens-on-september-10-key-details-and-risks-from-rhp"],
  ["Finology, Urban Company analysis", "https://recipe.finology.in/discover/premium-stock-research/urban-company-fundamental-analysis"],
  ["Outlook Business, Redseer online home services report", "https://www.outlookbusiness.com/news/indias-online-home-services-market-to-grow-at-22-to-hit-88-billion-by-fy30-report"],
] as const;

const flow = [
  [PhoneIncoming, "You call once", "Say the job, your address, when you need it and what you want to pay. In Hindi, English or Hinglish."],
  [PhoneOutgoing, "Sorted rings around", "It phones the local service people, asks each for a price and bargains towards yours."],
  [HandCoins, "You get a yes", "Sorted calls back with whoever agreed, the best one first and a backup, and their number."],
] as const;

export default function Home() {
  return (
    <ReactLenis root>
      <div className="mx-auto max-w-[88rem] px-4 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-line py-5">
          <p className="flex items-center gap-2">
            <span className="font-serif text-3xl italic">Sorted</span>
            <a href="https://www.vaani.dev" target="_blank" rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-1 text-sm text-muted transition hover:border-ink sm:flex">
              <Image src="/vaani-logo.png" alt="" width={20} height={18} />
              on Vaani
            </a>
          </p>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link>
            <Link href="/service-people" className="hidden text-sm text-muted hover:text-ink sm:inline">Service people</Link>
            <a href={`tel:${number.replace(/\s/g, "")}`} className="pill-dark rounded-full px-4 py-2 text-sm font-semibold tabular-nums">
              Call {number}
            </a>
          </div>
        </header>

        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <h1 className="font-serif text-[clamp(3rem,7vw,5.75rem)] leading-[0.92] tracking-[-0.02em] text-balance">
              One call,
              <br />
              and it&rsquo;s <PencilRing paths={RING}><em className="text-bronze">sorted.</em></PencilRing>
            </h1>
            <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-muted">
              The plumber, the AC mechanic and the electrician down the road have no app and no
              website. They have a phone. Tell Sorted the job and your price once, and it rings them
              for you, bargains, and calls you back with whoever said yes.
            </p>
            <p className="mt-3 text-sm text-muted">Your number and address go only to the one person you choose.</p>

            <div className="relative mt-12 max-w-[34rem]">
              <div className="pointer-events-none absolute -top-11 right-2 flex items-end gap-1 text-bronze" aria-hidden>
                <span className="font-serif text-xl italic">try it, your phone rings</span>
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
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
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
