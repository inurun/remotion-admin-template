import { Button } from "@/_shared/components/ui/button";
import { pitchesForAccent, splitKanaMoras } from "@/_shared/lib/kana-mora";

export function AccentEditor({
  pronunciation,
  value,
  onChange,
}: {
  pronunciation: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const moras = splitKanaMoras(pronunciation);
  const accent = Math.min(value, moras.length);
  const pitches = pitchesForAccent(moras.length, accent);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1">
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
            variant={accent === index + 1 ? "default" : "outline"}
            onClick={() => onChange(index + 1)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
      {moras.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs">
          {moras.map((mora, index) => (
            <span
              key={`${mora}-${index}`}
              className={
                pitches[index] === "high"
                  ? "rounded bg-primary px-2 py-1 text-primary-foreground"
                  : "rounded border px-2 py-1"
              }
            >
              {mora}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
