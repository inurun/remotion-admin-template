import { Button } from "@/_shared/components/ui/button";
import { pitchesForAccent } from "@/_shared/lib/kana-mora";

export function AccentEditor({
  moras,
  value,
  onChange,
}: {
  moras: string[];
  value: number;
  onChange: (value: number) => void;
}) {
  const accent = Math.min(value, moras.length);
  const pitches = pitchesForAccent(moras.length, accent);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        type="button"
        size="xs"
        variant={accent === 0 ? "default" : "outline"}
        disabled={moras.length === 0}
        onClick={() => onChange(0)}
      >
        Flat
      </Button>
      {moras.map((mora, index) => (
        <Button
          key={`${mora}-${index}`}
          type="button"
          size="xs"
          variant={pitches[index] === "high" ? "default" : "outline"}
          className={accent === index + 1 ? "ring-2 ring-primary ring-offset-1" : undefined}
          title={`Accent nucleus ${index + 1}`}
          onClick={() => onChange(index + 1)}
        >
          {mora}
        </Button>
      ))}
    </div>
  );
}
