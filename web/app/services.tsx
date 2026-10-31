import { Bug, Drop, Car, CookingPot, DeviceMobile, Hammer, Lightning, PaintRoller, Snowflake, SprayBottle, Truck, WashingMachine } from "@phosphor-icons/react/dist/ssr";

const SERVICES = [
  [Snowflake, "AC repair"], [Drop, "Plumber"], [Lightning, "Electrician"], [Hammer, "Carpenter"],
  [PaintRoller, "Painter"], [SprayBottle, "Deep cleaning"], [Bug, "Pest control"], [WashingMachine, "Appliances"],
  [DeviceMobile, "Phone repair"], [Truck, "Movers"], [CookingPot, "Cook for a day"], [Car, "Driver"],
] as const;

export default function Services() {
  return (
    <section className="py-10">
      <p className="text-muted">Any job a phone call can book</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {SERVICES.map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-2 rounded-full border border-line bg-paper/70 px-3.5 py-1.5 text-sm">
            <Icon className="size-4 text-bronze" weight="duotone" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
