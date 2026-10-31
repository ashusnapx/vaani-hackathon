import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Vendors from "./vendors";

export const metadata: Metadata = { title: "Service people", robots: { index: false, follow: false } };

export default function ServicePeoplePage() {
  return (
    <div className="mx-auto max-w-[96rem] px-4 pb-20 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-line py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-3xl italic">Sorted</Link>
          <span className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-1 text-sm text-muted">
            <Image src="/vaani-logo.png" alt="" width={20} height={18} />
            on Vaani
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-muted hover:text-ink">Home</Link>
          <Link href="/dashboard" className="text-muted hover:text-ink">Dashboard</Link>
          <span className="font-semibold">Service people</span>
        </nav>
      </header>
      <h1 className="pt-10 font-serif text-5xl">Service people</h1>
      <p className="mt-2 mb-10 max-w-[60ch] text-muted">
        Who Sorted rings, for which jobs. A request only reaches people in its category, one at a time, and
        numbers never leave the server in full.
      </p>
      <Vendors />
    </div>
  );
}
