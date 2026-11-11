import { Poster } from "@/components/app/poster";

/** Three plan covers fanned out, like a hand of cards. Pure decoration, so it is hidden from screen readers. */
export function WelcomeHero() {
  const cards = [
    {
      seed: "football",
      kind: "Football",
      line: "5v5 tonight",
      sub: "7 going",
      cls: "left-0 top-8 -rotate-[9deg]",
      z: "z-0",
    },
    {
      seed: "hackathon",
      kind: "Hackathon",
      line: "48 hours, need a designer",
      sub: "2 spots",
      cls: "left-[34%] top-0 rotate-[3deg]",
      z: "z-10",
    },
    {
      seed: "openmic",
      kind: "Event",
      line: "Open mic, Friday 8 PM",
      sub: "RSVP open",
      cls: "right-0 top-11 rotate-[11deg]",
      z: "z-0",
    },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto h-[15.5rem] w-full max-w-[22rem]">
      {cards.map((card, index) => (
        <Poster
          key={card.seed}
          seed={card.seed}
          className={`absolute h-48 w-[9.4rem] rounded-[22px] border border-white/20 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] motion-safe:animate-[float_6s_ease-in-out_infinite_alternate] ${card.cls} ${card.z}`}
        >
          <div
            style={{ animationDelay: `${index * -1.5}s` }}
            className="flex h-full flex-col justify-between text-[12px] font-bold"
          >
            <span className="text-white/90">{card.kind}</span>
            <span className="text-[13px] leading-tight text-white">
              {card.line}
              <span className="mt-0.5 block text-[11px] font-semibold text-white/80">
                {card.sub}
              </span>
            </span>
          </div>
        </Poster>
      ))}
    </div>
  );
}
