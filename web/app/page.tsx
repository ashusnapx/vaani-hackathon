import { ReactLenis } from "lenis/react";
import Image from "next/image";
import Board from "./board";
import CallMe from "./call-me";

const number = process.env.NEXT_PUBLIC_SORTED_NUMBER || "+91 80642 79097";

const flow = [
  ["You call once", "Say the job, your address, when you need it and what you want to pay. In Hindi, English or Hinglish."],
  ["Sorted rings around", "It phones the local service people, asks each for a price and bargains towards yours."],
  ["You get a yes", "Sorted calls back with whoever agreed, the best one first and a backup, and their number."],
];

export default function Home() {
  return (
    <ReactLenis root>
      <div className="mx-auto max-w-[88rem] px-4 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-line py-5">
          <p className="flex items-baseline gap-2">
            <span className="font-serif text-3xl italic">Sorted</span>
            <span className="hidden text-sm text-muted sm:inline">on Vaani</span>
          </p>
          <a href={`tel:${number.replace(/\s/g, "")}`} className="pill-dark rounded-full px-4 py-2 text-sm font-semibold tabular-nums">
            Call {number}
          </a>
        </header>

        <section className="grid gap-10 py-16 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:py-24">
          <h1 className="font-serif text-[clamp(3rem,7.5vw,6rem)] leading-[0.92] tracking-[-0.02em] text-balance">
            One call,
            <br />
            and it&rsquo;s <em className="text-bronze">sorted.</em>
          </h1>
          <div className="max-w-[34rem] space-y-6">
            <p className="text-lg leading-relaxed text-muted">
              The plumber, the AC mechanic and the electrician down the road have no app and no
              website. They have a phone. Tell Sorted the job and your price once, and it rings them
              for you, bargains, and calls you back with whoever said yes.
            </p>
            <p className="text-sm text-muted">
              Your number and address go only to the one person you choose.
            </p>
            <CallMe />
          </div>
        </section>

        <ol className="grid border-y border-line md:grid-cols-3">
          {flow.map(([title, body], i) => (
            <li key={title} className={`py-6 md:px-6 ${i ? "border-t border-line md:border-t-0 md:border-l" : "md:pl-0"}`}>
              <p className="font-serif text-2xl">{title}</p>
              <p className="mt-2 max-w-[36ch] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>

        <Board />

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
        </footer>
      </div>
    </ReactLenis>
  );
}
