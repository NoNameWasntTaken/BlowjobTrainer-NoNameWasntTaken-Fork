/**
 * Number of Custom.* voice slots under the Custom category (Custom1 … Custom{N}).
 */
export const CUSTOM_VOICE_CATEGORY_COUNT = 40

/** Ordered slot keys Custom1 … Custom{CUSTOM_VOICE_CATEGORY_COUNT} */
export const CUSTOM_VOICE_SLOT_KEYS = Array.from(
    { length: CUSTOM_VOICE_CATEGORY_COUNT },
    (_, i) => `Custom${i + 1}`
)
