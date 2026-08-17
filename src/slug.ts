/**
 * Mirrors api/Data/Slug.cs (kept in sync by hand - no shared package between
 * the two runtimes). Unicode letters/digits are kept as-is rather than
 * transliterated to ASCII, since CBDG is bilingual and a Hebrew book name
 * deserves a real slug in its own script, not a forced-empty one.
 */
export function slugify(name: string): string {
  const lower = name.trim().toLowerCase()
  let result = ''
  let lastWasHyphen = true // swallow a would-be leading hyphen
  for (const ch of lower) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      result += ch
      lastWasHyphen = false
    } else if (!lastWasHyphen) {
      result += '-'
      lastWasHyphen = true
    }
  }
  return result.replace(/^-+|-+$/g, '')
}

/** Slugifies `name`, then appends -2, -3, ... until `exists` reports the
 * candidate is free. `fallbackId` covers the empty-slug case (symbols/emoji-only names). */
export function generateUniqueSlug(
  name: string,
  fallbackId: string,
  exists: (candidate: string) => boolean,
): string {
  const base = slugify(name)
  if (!base) return fallbackId

  let candidate = base
  let suffix = 2
  while (exists(candidate)) {
    candidate = `${base}-${suffix}`
    suffix++
  }
  return candidate
}
