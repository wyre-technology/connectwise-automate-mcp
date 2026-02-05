/**
 * Tests for shared types
 */

import { describe, it, expect } from "vitest";
import { isDomainName } from "../utils/types.js";

describe("Types", () => {
  describe("isDomainName", () => {
    it("should return true for valid domain names", () => {
      expect(isDomainName("computers")).toBe(true);
      expect(isDomainName("clients")).toBe(true);
      expect(isDomainName("alerts")).toBe(true);
      expect(isDomainName("scripts")).toBe(true);
    });

    it("should return false for invalid domain names", () => {
      expect(isDomainName("invalid")).toBe(false);
      expect(isDomainName("")).toBe(false);
      expect(isDomainName("COMPUTERS")).toBe(false);
      expect(isDomainName("computer")).toBe(false);
      expect(isDomainName("tickets")).toBe(false);
    });
  });
});
