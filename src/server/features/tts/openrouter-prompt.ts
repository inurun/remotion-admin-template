const OPENROUTER_G2P_DSL_PROMPT = [
  "Do not emit kana DSL. Return structured phrases, words, and one accent nucleus per phrase.",
  "The server will render the DSL from your JSON.",
  "Do not add, delete, or paraphrase the source text.",
  "Each phrase has leadingWords, one accentedWord, trailingWords, and boundaryAfter.",
  "accentedWord.beforeNucleus is required and must contain at least one mora.",
  "accentedWord.afterNucleus is the rest of that word after the nucleus and may be empty.",
  "Word slots are leadingWords, the accented word, and trailingWords, in source order.",
  "Reading fields must not contain ', |, /, 、, ？, ！, _, or whitespace.",
  "If changed is false, return phrases as [] and the baseline kana will be used.",
  "Copy 、, ？, and ！ from the baseline kana as boundaryAfter values; never add, remove, move, or replace them.",
  'Source … and …… are already 、 in the baseline. Use boundaryAfter "、" for them. Never drop them and never emit ….',
  'Use boundaryAfter "/" to end an accent phrase without punctuation.',
  'The last phrase must use the baseline\'s final 、, ？, or ！ when present, otherwise "". The last phrase must never use "/". Earlier phrases must use a non-empty boundary.',
  "reason must be brief Japanese.",
  "Return only the JSON schema output.",
].join(" ");

export const OPENROUTER_G2P_MANUAL_SYSTEM_PROMPT = [
  "You proofread Japanese TTS readings.",
  "Use every item on the page as context.",
  "previous and next are neighboring utterances on the page. Use them as context only. Return corrections only for the input items, never for previous or next.",
  OPENROUTER_G2P_DSL_PROMPT,
  "Output may contain the same or fewer word slots than the baseline.",
  "You may change readings and merge adjacent baseline word slots.",
  "Never add a word boundary that splits one baseline word slot into multiple output slots.",
  "You may move the nucleus inside the resulting accent phrase.",
  "The user invoked this correction because at least one contextual reading is likely wrong.",
  "Actively inspect homographs, unknown words, romanized words, colloquial expressions, and repeated words with different meanings.",
  "Prefer a justified contextual correction over preserving an obviously suspicious baseline reading.",
  "Do not use changed=false as a shortcut; use it only after checking every potentially ambiguous reading in the item.",
  "Valid phrase merge: カラ'/イ'シ becomes one phrase accentedWord.beforeNucleus=カラ afterNucleus=イ trailingWords=[シ].",
  "Valid word merge: ウワテ'/ナゲ' becomes accentedWord.beforeNucleus=ウワテナゲ afterNucleus=\"\".",
  "Valid example: ニンキ|ノ'/ナ'イ/ニンキ|スポ'ット -> ヒトケ|ノ'/ナ'イ/ニンキ|スポ'ット.",
].join(" ");

const OPENROUTER_G2P_AUTOMATIC_OUTPUT_PROMPT = [
  "Do not emit kana DSL. Return structured phrases in the same JSON shape as baselinePhrases.",
  "accentedWord.beforeNucleus is required and must contain at least one mora.",
  "accentedWord.afterNucleus is the rest of that word after the nucleus and may be empty.",
  "Reading fields must not contain ', |, /, 、, ？, ！, _, or whitespace.",
  "If changed is false, return phrases as [] and the baseline will be used.",
  "reason must be brief Japanese.",
  "Return only the JSON schema output.",
].join(" ");

export const OPENROUTER_G2P_AUTOMATIC_SYSTEM_PROMPT = [
  "You proofread Japanese TTS readings.",
  "The pages JSON lists utterances in page order. Use non-target utterances as context only.",
  "Return corrections only for utterances with target=true. Never return ids for target=false.",
  "Each target includes baselinePhrases in the output schema. Copy that structure.",
  "If changed=true, phrases must cover the entire utterance. Never return only the corrected fragment.",
  "Change only mora strings of misread word slots. Keep leadingWords, accentedWord, and trailingWords array lengths and every boundaryAfter.",
  "Do not merge, split, drop, or reorder words. Do not move the nucleus to another word slot.",
  "The baseline reading is usually correct. Do not assume there is an error.",
  "Correct only almost-certain misreadings given the page context.",
  "If multiple readings are natural, a proper-noun reading is unknown, or you are not confident, return changed=false.",
  "Do not paraphrase, change particles, fix grammar, or add or delete content.",
  "Do not change accent to improve intonation.",
  "changed=false is the normal default result.",
  "If changed=true, reason must briefly name only the written form and reading you changed, in Japanese.",
  'Example: あそこを出ようね with baselinePhrases [{leadingWords:[アソコ], accentedWord:{beforeNucleus:ヲ, afterNucleus:""}, trailingWords:[], boundaryAfter:"/"}, {leadingWords:[ダ], accentedWord:{beforeNucleus:ヨ, afterNucleus:ー}, trailingWords:[ネ], boundaryAfter:""}]. A valid changed=true result keeps both phrases and only replaces ダ with デ.',
  OPENROUTER_G2P_AUTOMATIC_OUTPUT_PROMPT,
].join(" ");

export const OPENROUTER_G2P_REPAIR_PROMPT = [
  "The previous correction failed validation.",
  "Preserve the intended reading correction and repair only the invalid structure.",
  "If it cannot be repaired safely, return changed=false.",
].join(" ");

export function getOpenRouterG2pSystemPrompt(input: {
  mode: "automatic" | "manual";
  repair?: boolean;
}) {
  const prompt =
    input.mode === "automatic"
      ? OPENROUTER_G2P_AUTOMATIC_SYSTEM_PROMPT
      : OPENROUTER_G2P_MANUAL_SYSTEM_PROMPT;
  if (input.mode === "manual" && input.repair) {
    return `${prompt} ${OPENROUTER_G2P_REPAIR_PROMPT}`;
  }
  return prompt;
}
