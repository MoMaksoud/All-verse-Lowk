/**
 * Generates an array of lowercase search keyword tokens from listing fields.
 * Stored in Firestore as `searchKeywords` for efficient `array-contains` queries.
 */
export function generateSearchKeywords(fields: {
  title: string;
  description: string;
  brand?: string;
  model?: string;
  category?: string;
}): string[] {
  const parts = [
    fields.title,
    fields.description,
    fields.brand,
    fields.model,
    fields.category,
  ]
    .filter(Boolean)
    .join(' ');

  // Lowercase, split on non-alphanumeric, deduplicate, filter short words
  const tokens = parts
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2);

  // Also add concatenated bigrams from the title (e.g., "iphone 15" -> "iphone15")
  const titleWords = (fields.title || '').toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  for (let i = 0; i < titleWords.length - 1; i++) {
    tokens.push(titleWords[i].replace(/[^a-z0-9]/g, '') + titleWords[i + 1].replace(/[^a-z0-9]/g, ''));
  }

  // Firestore arrays recommended max ~100 elements; cap at 80
  return [...new Set(tokens)].slice(0, 80);
}
