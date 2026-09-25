/**
 * Legacy ordered list of Custom.* slots (Custom1 … Custom{N}).
 * Not an allowlist: packs may store any valid voice key, and these names stay valid forever.
 */
export const CUSTOM_VOICE_CATEGORY_COUNT = 40

/** Ordered legacy slot keys Custom1 … Custom{CUSTOM_VOICE_CATEGORY_COUNT} */
export const CUSTOM_VOICE_SLOT_KEYS = Array.from(
    { length: CUSTOM_VOICE_CATEGORY_COUNT },
    (_, i) => `Custom${i + 1}`
)
