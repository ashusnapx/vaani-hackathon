import type { Metadata } from "next";
import Vendors from "./vendors";

export const metadata: Metadata = { title: "Service people", robots: { index: false, follow: false } };

export default function ServicePeoplePage() {
  return (
    <div className="mx-auto max-w-[96rem] px-4 pb-20 sm:px-8">
      <h1 className="pt-10 font-serif text-5xl">Service people</h1>
      <p className="mt-2 mb-10 max-w-[60ch] text-muted">
        Who Sorted rings, for which jobs. A request only reaches people in its category, one at a time, and
        numbers never leave the server in full.
      </p>
      <Vendors />
    </div>
  );
}
