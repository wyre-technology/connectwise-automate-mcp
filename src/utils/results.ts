/**
 * Helpers for building MCP tool results.
 */

import type { CallToolResult } from "./types.js";

/**
 * Wrap any JSON-serializable value in the standard text tool result.
 */
export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

/**
 * Shape a ConnectWise Automate paginated list response (`{ Data, TotalRecords }`)
 * into a friendly `{ total, <key> }` tool result. Centralizing this keeps the
 * library's response contract in one place across every list/search handler.
 */
export function listResult<T>(
  key: string,
  response: { TotalRecords?: number; Data: T[] }
): CallToolResult {
  return jsonResult({
    total: response.TotalRecords ?? response.Data.length,
    [key]: response.Data,
  });
}
