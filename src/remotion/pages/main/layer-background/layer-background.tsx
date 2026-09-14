import { Layer } from "@/remotion/components/layter";
import { Telop } from "@/remotion/components/telop/telop";

const BRAND = "NIKKI DOGA";
const CREAM = "#f3ead3";
const RED = "#c43b3b";
const OUTLINE = "#d1d1d1";

export function BackgroundLayer() {
  return (
    <Layer className="overflow-hidden" style={{ backgroundColor: CREAM }}>
      <div className="absolute inset-y-0 left-0 w-[200px] text-[#b83c3c]">
        <div className="px-7 pt-14 font-sans text-xl leading-snug">
          <p>Tsumugi Kasukabe</p>
          <p>Sayo</p>
          <p className="underline decoration-1 underline-offset-4">Zunda-mon</p>
        </div>
        <div className="absolute bottom-24 left-7 flex gap-5 font-rowdy text-[1.65rem] tracking-[0.35em] [writing-mode:vertical-rl]">
          <p>Rokna kotonae</p>
          <p>Natsuyehsmi</p>
        </div>
      </div>

      <div className="absolute inset-y-0 left-[200px] w-[420px] bg-[#c43b3b]">
        <div className="absolute top-1/2 left-[22%] -translate-x-1/2 -translate-y-1/2 -rotate-90">
          <Telop text={BRAND} fontSize={118} fill={CREAM} />
        </div>
        <div className="absolute top-1/2 left-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-90">
          <Telop text={BRAND} fontSize={168} fill={CREAM} />
        </div>
        <p className="absolute top-16 right-4 font-sans text-[1.15rem] tracking-wide text-[#f3ead3]/85 [writing-mode:vertical-rl]">
          8 August toko month nanka Ekanzi today--
        </p>
      </div>

      <div className="-rotate-45 absolute top-0 right-50">
        <div className="absolute top-0 right-[5%]" style={{ backgroundColor: CREAM }}>
          <Telop text={BRAND} fontSize={230} fill={CREAM} stroke={OUTLINE} strokeWidth={10} />
        </div>
        <div className="absolute top-40 right-[5%]" style={{ backgroundColor: CREAM }}>
          <Telop text={BRAND} fontSize={230} fill={CREAM} stroke={OUTLINE} strokeWidth={10} />
        </div>
        <div className="absolute top-80 right-[5%]" style={{ backgroundColor: CREAM }}>
          <Telop text={BRAND} fontSize={230} fill={CREAM} stroke={OUTLINE} strokeWidth={10} />
        </div>
      </div>

      <div className="absolute top-14 right-20 h-1.5 w-[420px]" style={{ backgroundColor: RED }} />
    </Layer>
  );
}
