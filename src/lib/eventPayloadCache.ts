/**
 * CACHE ΤΟΥ ΕΤΟΙΜΟΥ PAYLOAD ΤΟΥ EVENT (in-memory, ανά διεργασία).
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: η συγχώνευση 300+ αγώνων κοστίζει ~1,3s σε κάθε αίτηση. Κρατάμε
 * το έτοιμο JSON για λίγα δευτερόλεπτα ώστε όλοι οι επισκέπτες να παίρνουν την ίδια
 * απάντηση σε ~0,3s.
 *
 * ΣΗΜΑΝΤΙΚΟ: όποιος γράφει δεδομένα (desk, admin, scoreboard) πρέπει να καλεί
 * `purgeEventPayloadCache()` — αλλιώς η αλλαγή θα φανεί μετά τη λήξη του TTL.
 * Τα ζωντανά σκορ ΔΕΝ περνούν από εδώ (άλλο endpoint, `no-store`).
 */
const EVENT_PAYLOAD_TTL_MS = 15_000
const EVENT_PAYLOAD_MAX_ENTRIES = 60

type CacheEntry = { at: number; payload: unknown }

const globalBag = globalThis as typeof globalThis & {
    __btEventPayloadCache?: Map<string, CacheEntry>
}

const cache: Map<string, CacheEntry> =
    globalBag.__btEventPayloadCache ?? new Map<string, CacheEntry>()
globalBag.__btEventPayloadCache = cache

export const readCachedEventPayload = (documentId: string): unknown | null => {
    const entry = cache.get(documentId)
    if (!entry) return null
    if (Date.now() - entry.at > EVENT_PAYLOAD_TTL_MS) {
        cache.delete(documentId)
        return null
    }
    return entry.payload
}

export const writeCachedEventPayload = (documentId: string, payload: unknown): void => {
    if (cache.size >= EVENT_PAYLOAD_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest) cache.delete(oldest)
    }
    cache.set(documentId, { at: Date.now(), payload })
}

/** Άδειασμα μετά από εγγραφή (desk / admin / scoreboard) ώστε η αλλαγή να φανεί αμέσως. */
export const purgeEventPayloadCache = (documentId?: string): void => {
    if (documentId) {
        cache.delete(documentId)
        return
    }
    cache.clear()
}
