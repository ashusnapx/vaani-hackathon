import { BadgeCheck, CalendarClock, EyeOff, FileAudio, IndianRupee, Languages, ListChecks, Lock, PiggyBank, Receipt, Repeat2, ShieldCheck, Star, Tags, TrendingDown } from "lucide-react";

// Everything Sorted actually does today. Add a line here with every new feature.
const FEATURES = [
  [Tags, "Sorts the job", "Reads the issue, picks the category, rings only people who do that work."],
  [EyeOff, "Keeps your budget secret", "Mechanics hear the job, the time and the area. Never your number."],
  [TrendingDown, "Bargains with a rival quote", "Each next mechanic hears the best price so far, and is asked to beat it."],
  [IndianRupee, "Understands any price", "₹800, 800 to 1,000, visit plus parts, per hour, 1.5k. All compared fairly."],
  [Receipt, "Asks if it's all-in", "Visit charge and parts, said out loud. No surprises at the door."],
  [Repeat2, "Counter-offers for you", "Nobody fits? Name your price and Sorted goes back once more."],
  [Languages, "Your language, and theirs", "Pick from 11 Indian languages for your calls. With mechanics, it follows whatever they speak."],
  [ListChecks, "Best and a backup", "Cheapest firm price wins. Ties go to all-in, verified, better rated, then sooner."],
  [PiggyBank, "Shows what it saved", "From their opening price to the deal, in rupees."],
  [Lock, "Locks the price on record", "The mechanic confirms price and time on a recorded call."],
  [ShieldCheck, "Can't be talked round", "Prompt injection, fake staff, abuse and data fishing are refused and flagged."],
  [BadgeCheck, "Verified service people", "The operator vouches for people they've checked; they win ties."],
  [Star, "Ratings by phone", "After the job, Sorted rings you for a 1 to 5. Good work gets more calls."],
  [CalendarClock, "Cancel or move it by voice", "Call back and say so. Sorted stops the search or tells the mechanic."],
  [FileAudio, "Every call on file", "Recording, transcript, summary, quality score and cost for each call."],
] as const;

export default function Features() {
  return (
    <section className="py-16">
      <h2 className="font-serif text-5xl">What&rsquo;s inside</h2>
      <ul className="mt-8 grid border-t border-line md:grid-cols-2">
        {FEATURES.map(([Icon, title, body], i) => (
          <li key={title} className={`flex gap-4 border-b border-line py-5 ${i % 2 === 0 ? "md:border-r md:pr-8" : "md:pl-8"}`}>
            <Icon className="mt-1 size-5 shrink-0 text-bronze" strokeWidth={1.75} aria-hidden />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
