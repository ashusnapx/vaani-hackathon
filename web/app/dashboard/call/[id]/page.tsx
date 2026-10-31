import { GaugeIcon as Gauge, UsersThreeIcon as UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Journey from "./journey";

export const metadata: Metadata = { title: "Sorted — call" };

export default async function CallPage({ params }: PageProps<"/dashboard/call/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-[96rem] px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-line py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-3xl italic">Sorted</Link>
          <span className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-1 text-sm text-muted">
            <Image src="/vaani-logo.png" alt="" width={20} height={18} />
            on Vaani
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-muted hover:text-ink"><Gauge className="size-4" /> Dashboard</Link>
          <Link href="/service-people" className="flex items-center gap-1.5 text-muted hover:text-ink"><UsersThree className="size-4" /> Service people</Link>
        </nav>
      </header>
      <Journey id={decodeURIComponent(id)} />
    </div>
  );
}
