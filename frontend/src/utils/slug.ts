/**
 * Generates a URL-friendly slug from an article title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/^-|-$/g, '');        // Trim leading/trailing dashes
}
