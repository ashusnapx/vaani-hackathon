import { AirVent, Bug, Car, ChefHat, Hammer, PaintRoller, PlugZap, Smartphone, SprayCan, Truck, WashingMachine, Wrench } from "lucide-react";

const SERVICES = [
  [AirVent, "AC repair"], [Wrench, "Plumber"], [PlugZap, "Electrician"], [Hammer, "Carpenter"],
  [PaintRoller, "Painter"], [SprayCan, "Deep cleaning"], [Bug, "Pest control"], [WashingMachine, "Appliances"],
  [Smartphone, "Phone repair"], [Truck, "Movers"], [ChefHat, "Cook for a day"], [Car, "Driver"],
] as const;

export default function Services() {
  return (
    <section className="py-10">
      <p className="text-muted">Any job a phone call can book</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {SERVICES.map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-2 rounded-full border border-line bg-paper/70 px-3.5 py-1.5 text-sm">
            <Icon className="size-4 text-bronze" strokeWidth={1.75} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
