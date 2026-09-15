const KANA_OR_SYMBOL_ONLY =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{P}\p{S}\p{Z}\u30FC\u3099\u309A]+$/u;

export function needsAutomaticLlmAnalyze(readText: string) {
  return !KANA_OR_SYMBOL_ONLY.test(readText);
}
