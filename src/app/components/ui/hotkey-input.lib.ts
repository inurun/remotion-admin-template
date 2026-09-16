const MODIFIER_ORDER = ["ctrl", "shift", "alt", "meta"] as const;
const MODIFIERS = new Set<string>(MODIFIER_ORDER);

function normalizeRecordedKey(key: string) {
  return key.trim().toLowerCase();
}

export function recordedKeysToHotkey(keys: ReadonlySet<string>) {
  const normalizedKeys = [...keys].map(normalizeRecordedKey).filter(Boolean);
  const key = normalizedKeys.find((item) => !MODIFIERS.has(item));
  if (!key) {
    return null;
  }

  const modifiers = MODIFIER_ORDER.filter((modifier) => normalizedKeys.includes(modifier));
  return [...modifiers, key].join("+");
}
