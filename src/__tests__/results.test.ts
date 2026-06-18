/**
 * Tests for MCP tool result helpers.
 *
 * Regression coverage for issue #35: the ConnectWise Automate REST API returns
 * list endpoints as a bare JSON array, even though the client library's types
 * model them as `{ Data, TotalRecords }`. listResult/listItems must tolerate
 * either shape (and anything unexpected) without throwing.
 */

import { describe, it, expect } from "vitest";
import { jsonResult, listResult, listItems } from "../utils/results.js";

/** Parse the JSON payload back out of a tool result. */
function payloadOf(result: { content: Array<{ text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}

describe("jsonResult", () => {
  it("wraps a value as pretty-printed text content", () => {
    const result = jsonResult({ hello: "world" });
    expect(result.content[0].type).toBe("text");
    expect(payloadOf(result)).toEqual({ hello: "world" });
  });
});

describe("listResult", () => {
  it("handles a bare array (the real CWA API shape) — issue #35", () => {
    const response = [
      { Id: 1, ComputerName: "A" },
      { Id: 2, ComputerName: "B" },
    ];

    const result = listResult("computers", response);

    const data = payloadOf(result) as { total: number; computers: unknown[] };
    expect(data.total).toBe(2);
    expect(data.computers).toHaveLength(2);
  });

  it("handles an empty bare array without throwing", () => {
    const result = listResult("computers", []);
    const data = payloadOf(result) as { total: number; computers: unknown[] };
    expect(data.total).toBe(0);
    expect(data.computers).toEqual([]);
  });

  it("still handles the documented { Data, TotalRecords } envelope", () => {
    const response = { TotalRecords: 5, Data: [{ Id: 1 }, { Id: 2 }] };
    const result = listResult("alerts", response);
    const data = payloadOf(result) as { total: number; alerts: unknown[] };
    expect(data.total).toBe(5);
    expect(data.alerts).toHaveLength(2);
  });

  it("falls back to the item count when TotalRecords is absent", () => {
    const response = { Data: [{ Id: 1 }, { Id: 2 }, { Id: 3 }] };
    const result = listResult("scripts", response);
    const data = payloadOf(result) as { total: number };
    expect(data.total).toBe(3);
  });

  it("returns an empty list for null/undefined/unexpected responses", () => {
    for (const bad of [null, undefined, 42, "nope", {}]) {
      const result = listResult("clients", bad);
      const data = payloadOf(result) as { total: number; clients: unknown[] };
      expect(data.total).toBe(0);
      expect(data.clients).toEqual([]);
    }
  });
});

describe("listItems", () => {
  it("returns the array from a bare array response", () => {
    expect(listItems([{ Id: 1 }])).toEqual([{ Id: 1 }]);
  });

  it("returns the Data array from an envelope response", () => {
    expect(listItems({ Data: [{ Id: 1 }], TotalRecords: 1 })).toEqual([
      { Id: 1 },
    ]);
  });

  it("returns an empty array for unexpected responses", () => {
    expect(listItems(null)).toEqual([]);
    expect(listItems(undefined)).toEqual([]);
    expect(listItems({})).toEqual([]);
  });
});
