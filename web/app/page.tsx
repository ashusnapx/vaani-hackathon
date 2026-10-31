import { ReactLenis } from "lenis/react";
import VisitorLog from "./visitor-log";

const number = process.env.NEXT_PUBLIC_DOORMAN_NUMBER;

const steps = [
  ["Forward once", "Her phone sends unknown and unanswered calls to Doorman. One dial code: **61*number#."],
  ["Doorman picks up", "In Hindi, English or Hinglish. It finds out who is calling and why, and never shares a thing about her."],
  ["The family knows", "A scam rings your phone while the caller is still on the line. Genuine calls become a message."],
];

export default function Home() {
  return (
    <ReactLenis root>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <span className="font-serif text-3xl italic">Doorman</span>
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-mute">
          <span className="on-duty size-2 rounded-full bg-safe" aria-hidden />
          On duty for Kamla ji
        </span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <section className="pt-6 lg:sticky lg:top-8 lg:self-start lg:pt-16">
          <p className="mb-6 text-sm tracking-[0.2em] text-brass uppercase">Care and Safety</p>
          <h1 className="font-serif text-6xl leading-[0.95] sm:text-7xl">
            Every call meets the <em className="text-brass">doorman</em> first.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-mute">
            Scammers call our parents first: a fake CBI officer, a bank that needs the OTP, a
            grandson in trouble from a new number. Doorman answers instead, and tells you the
            moment someone asks for money.
          </p>
          {number && (
            <a
              href={`tel:${number.replace(/\s/g, "")}`}
              className="mt-8 inline-flex items-baseline gap-3 rounded-2xl bg-ivory px-6 py-4 text-ink transition hover:bg-brass"
            >
              <span className="text-sm">Call it</span>
              <span className="font-serif text-3xl">{number}</span>
            </a>
          )}
          <ol className="mt-14 space-y-6 border-l border-line pl-6">
            {steps.map(([title, body], i) => (
              <li key={title}>
                <p className="font-serif text-2xl">
                  <span className="mr-3 text-brass">{i + 1}</span>
                  {title}
                </p>
                <p className="mt-1 max-w-md text-mute">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <VisitorLog />
      </main>
    </ReactLenis>
  );
}
