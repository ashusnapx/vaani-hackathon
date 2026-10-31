"use client";

import { GaugeIcon as Gauge, HouseIcon as House, PhoneIcon as Phone, UsersThreeIcon as UsersThree } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const number = process.env.NEXT_PUBLIC_SORTED_NUMBER || "+91 80642 79097";

const PAGES = [
  { href: "/", label: "Home", Icon: House },
  { href: "/dashboard", label: "Dashboard", Icon: Gauge },
  { href: "/service-people", label: "Service people", Icon: UsersThree },
];

/** One header for every page, in the root layout, so it never shifts between pages. Request and call pages light up Dashboard. */
export default function SiteNav() {
  return (
    <header className="mx-auto flex max-w-[96rem] items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
      <div className="flex items-center gap-2">
        <Link href="/" className="font-serif text-3xl italic">Sorted</Link>
        <a href="https://www.vaani.dev" target="_blank" rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-1 text-sm text-muted transition hover:border-ink md:flex">
          <Image src="/vaani-logo.png" alt="" width={20} height={18} />
          on Vaani
        </a>
      </div>
      <div className="flex items-center gap-2">
        {/* the path is URL data on request and call pages, so it streams in; until then no pill is lit */}
        <Suspense fallback={<Pills />}>
          <ActivePills />
        </Suspense>
        <a href={`tel:${number.replace(/\s/g, "")}`} aria-label={`Call Sorted on ${number}`}
          className="flex items-center gap-2 rounded-full border border-line-strong bg-paper px-3 py-2 text-sm font-semibold tabular-nums transition hover:border-ink lg:px-4">
          <Phone className="size-4" weight="fill" aria-hidden />
          <span className="hidden lg:inline">{number}</span>
        </a>
      </div>
    </header>
  );
}

function ActivePills() {
  return <Pills path={usePathname()} />;
}

function Pills({ path }: { path?: string }) {
  const active = (href: string) => !!path && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav aria-label="Pages" className="flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1">
      {PAGES.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-label={label} aria-current={active(href) ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition sm:px-3.5 ${active(href) ? "pill-dark font-semibold" : "text-muted hover:bg-paper hover:text-ink"}`}>
          <Icon className="size-4" weight={active(href) ? "fill" : "regular"} aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
