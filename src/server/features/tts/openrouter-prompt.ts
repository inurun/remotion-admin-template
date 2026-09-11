const OPENROUTER_G2P_DSL_PROMPT = [
  "Return kana as editor DSL. Example: ニンキ|ノ'/ナ'イ.",
  "Do not add, delete, or paraphrase the source text.",
  "Each accent phrase has exactly one ' nucleus. Separate words with |.",
  "Use / to end an accent phrase without punctuation. Copy 、, ？, and ！ from the baseline kana; never add, remove, move, or replace them.",
  "Source … and …… are already 、 in the baseline. Keep those 、. Never drop them and never emit ….",
  "The last phrase must keep the baseline's final 、, ？, or ！ when present. The last phrase must never end with /.",
  "If changed is false, return kana as an empty string and the baseline kana will be used.",
  "If changed is true, kana must cover the entire utterance. Never return only the corrected fragment.",
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
  "Valid phrase merge: カラ'/イ'シ becomes カラ'イ|シ.",
  "Valid word merge: ウワテ'/ナゲ' becomes ウワテナゲ'.",
  "Valid example: ニンキ|ノ'/ナ'イ/ニンキ|スポ'ット -> ヒトケ|ノ'/ナ'イ/ニンキ|スポ'ット.",
].join(" ");

const OPENROUTER_G2P_AUTOMATIC_OUTPUT_PROMPT = [
  "Copy baselineKana and change only misread mora strings.",
  "If changed is false, return kana as an empty string and the baseline will be used.",
  "If changed is true, kana must be the full-utterance DSL. Never return only the corrected fragment.",
  "reason must be brief Japanese.",
  "Return only the JSON schema output.",
].join(" ");

export const OPENROUTER_G2P_AUTOMATIC_SYSTEM_PROMPT = [
  "You proofread Japanese TTS readings.",
  "The pages JSON lists utterances in page order. Use non-target utterances as context only.",
  "Return corrections only for utterances with target=true. Never return ids for target=false.",
  "Each target includes baselineKana. Copy that DSL and change readings only.",
  "Keep the same phrase count, | word slots, ' nucleus slot, and every / 、 ？ ！ boundary.",
  "Do not merge, split, drop, or reorder words. Do not move the nucleus to another word slot.",
  "The baseline reading is usually correct. Do not assume there is an error.",
  "Correct only almost-certain misreadings given the page context.",
  "If multiple readings are natural, a proper-noun reading is unknown, or you are not confident, return changed=false.",
  "Do not paraphrase, change particles, fix grammar, or add or delete content.",
  "Do not change accent to improve intonation.",
  "changed=false is the normal default result.",
  "If changed=true, reason must briefly name only the written form and reading you changed, in Japanese.",
  "Example: あそこを出ようね with baselineKana アソコ|ヲ'/ダ|ヨ'ー|ネ. A valid changed=true result is アソコ|ヲ'/デ|ヨ'ー|ネ.",
  OPENROUTER_G2P_AUTOMATIC_OUTPUT_PROMPT,
].join(" ");

export const OPENROUTER_G2P_REPAIR_PROMPT = [
  "The previous correction failed syntax, topology, or Validate.",
  "Keep the intended reading correction. Fix only the cited syntax, topology, or Validate errors.",
  "Do not change items that were not listed.",
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
  if (input.repair) {
    return `${prompt} ${OPENROUTER_G2P_REPAIR_PROMPT}`;
  }
  return prompt;
}
