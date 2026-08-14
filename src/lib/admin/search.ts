/**
 * Escapes characters that would break a Supabase `.ilike()`/`.or()` filter
 * string — `%`/`_` are SQL LIKE wildcards, `,`/`(`/`)` are the `.or()`
 * mini-syntax's own delimiters (see PostgREST's filter grammar). Without
 * this, typing e.g. "Ahmet, Mehmet" into an admin search box would either
 * throw or silently be parsed as two separate filter clauses instead of
 * one literal search term. Used by any admin list page that turns a
 * free-text `?q=` into a DB-level search.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,()]/g, " ").trim();
}
