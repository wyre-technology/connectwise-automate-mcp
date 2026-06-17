/**
 * Pagination helpers shared across domain handlers.
 *
 * The MCP tools expose an offset-based `skip` parameter for familiarity, but the
 * ConnectWise Automate library paginates by 1-indexed `page` number. This bridges
 * the two.
 */

/**
 * Convert an offset-based `skip` into the library's 1-indexed `page` number.
 * Returns `undefined` when no offset is requested so the library default (page 1)
 * applies.
 */
export function toPage(skip: number, pageSize: number): number | undefined {
  if (!skip || skip <= 0 || pageSize <= 0) {
    return undefined;
  }
  return Math.floor(skip / pageSize) + 1;
}
