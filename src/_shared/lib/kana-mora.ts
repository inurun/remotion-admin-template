const SMALL_KANA = new Set(["ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ", "ヮ", "ゎ"]);

export function toKatakana(value: string) {
  return Array.from(value, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : char;
  }).join("");
}

export function splitKanaMoras(value: string) {
  const moras: string[] = [];
  for (const char of toKatakana(value.trim())) {
    if (SMALL_KANA.has(char) && moras.length > 0 && !SMALL_KANA.has(moras.at(-1) ?? "")) {
      moras[moras.length - 1] += char;
    } else {
      moras.push(char);
    }
  }
  return moras;
}

export type DisplayPitch = "low" | "high";

export function pitchesForAccent(moraCount: number, accentNucleus: number): DisplayPitch[] {
  if (moraCount <= 0) return [];
  if (moraCount === 1) return ["high"];
  if (accentNucleus === 1) return ["high", ...Array<DisplayPitch>(moraCount - 1).fill("low")];
  return Array.from({ length: moraCount }, (_, index) => {
    if (index === 0) return "low";
    return accentNucleus === 0 || index < accentNucleus ? "high" : "low";
  });
}
