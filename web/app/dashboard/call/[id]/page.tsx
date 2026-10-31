import type { Metadata } from "next";
import { Suspense } from "react";
import { PEOPLE } from "../../../sketch-art";
import Journey from "./journey";

export const metadata: Metadata = { title: "Call", robots: { index: false, follow: false } };

// The call id is request-time data, so it is read inside a Suspense boundary (Cache Components).
async function Body({ params }: { params: PageProps<"/dashboard/call/[id]">["params"] }) {
  const { id } = await params;
  return <Journey id={decodeURIComponent(id)} people={PEOPLE} />;
}

export default function CallPage({ params }: PageProps<"/dashboard/call/[id]">) {
  return (
    <div className="mx-auto max-w-[96rem] px-4 sm:px-8">
      <Suspense fallback={<p className="pt-10 text-muted">Loading the request…</p>}>
        <Body params={params} />
      </Suspense>
    </div>
  );
}
