/**
 * Tests for navigation and domain state management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock handlers using vi.hoisted
const { mockHandlers } = vi.hoisted(() => {
  const mockHandlers = {
    computers: {
      getTools: vi.fn().mockReturnValue([
        { name: "cwautomate_computers_list", description: "List computers" },
        { name: "cwautomate_computers_get", description: "Get computer" },
      ]),
      handleCall: vi.fn(),
    },
    clients: {
      getTools: vi.fn().mockReturnValue([
        { name: "cwautomate_clients_list", description: "List clients" },
        { name: "cwautomate_clients_get", description: "Get client" },
      ]),
      handleCall: vi.fn(),
    },
    alerts: {
      getTools: vi.fn().mockReturnValue([
        { name: "cwautomate_alerts_list", description: "List alerts" },
        { name: "cwautomate_alerts_get", description: "Get alert" },
      ]),
      handleCall: vi.fn(),
    },
    scripts: {
      getTools: vi.fn().mockReturnValue([
        { name: "cwautomate_scripts_list", description: "List scripts" },
        { name: "cwautomate_scripts_get", description: "Get script" },
      ]),
      handleCall: vi.fn(),
    },
  };

  return { mockHandlers };
});

// Mock all domain handlers
vi.mock("../domains/computers.js", () => ({
  computersHandler: mockHandlers.computers,
}));

vi.mock("../domains/clients.js", () => ({
  clientsHandler: mockHandlers.clients,
}));

vi.mock("../domains/alerts.js", () => ({
  alertsHandler: mockHandlers.alerts,
}));

vi.mock("../domains/scripts.js", () => ({
  scriptsHandler: mockHandlers.scripts,
}));

import {
  getDomainHandler,
  getAvailableDomains,
  clearDomainCache,
} from "../domains/index.js";
import { isDomainName } from "../utils/types.js";

describe("Domain Navigation", () => {
  beforeEach(() => {
    clearDomainCache();
    vi.clearAllMocks();

    // Reset mock return values
    mockHandlers.computers.getTools.mockReturnValue([
      { name: "cwautomate_computers_list", description: "List computers" },
      { name: "cwautomate_computers_get", description: "Get computer" },
    ]);
    mockHandlers.clients.getTools.mockReturnValue([
      { name: "cwautomate_clients_list", description: "List clients" },
      { name: "cwautomate_clients_get", description: "Get client" },
    ]);
    mockHandlers.alerts.getTools.mockReturnValue([
      { name: "cwautomate_alerts_list", description: "List alerts" },
      { name: "cwautomate_alerts_get", description: "Get alert" },
    ]);
    mockHandlers.scripts.getTools.mockReturnValue([
      { name: "cwautomate_scripts_list", description: "List scripts" },
      { name: "cwautomate_scripts_get", description: "Get script" },
    ]);
  });

  describe("getAvailableDomains", () => {
    it("should return all available domains", () => {
      const domains = getAvailableDomains();

      expect(domains).toEqual(["computers", "clients", "alerts", "scripts"]);
    });

    it("should return a consistent list", () => {
      const domains1 = getAvailableDomains();
      const domains2 = getAvailableDomains();

      expect(domains1).toEqual(domains2);
    });
  });

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
    });
  });

  describe("getDomainHandler", () => {
    it("should load computers domain handler", async () => {
      const handler = await getDomainHandler("computers");

      expect(handler).toBeDefined();
      expect(handler.getTools).toBeDefined();
      expect(handler.handleCall).toBeDefined();
    });

    it("should load clients domain handler", async () => {
      const handler = await getDomainHandler("clients");

      expect(handler).toBeDefined();
      expect(handler.getTools()).toHaveLength(2);
    });

    it("should load alerts domain handler", async () => {
      const handler = await getDomainHandler("alerts");

      expect(handler).toBeDefined();
      expect(handler.getTools()).toHaveLength(2);
    });

    it("should load scripts domain handler", async () => {
      const handler = await getDomainHandler("scripts");

      expect(handler).toBeDefined();
      expect(handler.getTools()).toHaveLength(2);
    });

    it("should cache domain handlers", async () => {
      const handler1 = await getDomainHandler("computers");
      const handler2 = await getDomainHandler("computers");

      expect(handler1).toBe(handler2);
    });

    it("should throw for unknown domain", async () => {
      await expect(
        getDomainHandler("unknown" as "computers")
      ).rejects.toThrow("Unknown domain: unknown");
    });
  });

  describe("clearDomainCache", () => {
    it("should clear the cached handlers", async () => {
      // Load a handler to cache it
      const _handler1 = await getDomainHandler("computers");

      // Clear cache
      clearDomainCache();

      // The handler should still be loadable
      const handler2 = await getDomainHandler("computers");

      // Both should have same interface but may be different objects
      expect(handler2).toBeDefined();
      expect(handler2.getTools).toBeDefined();
    });
  });
});

describe("Domain Tools Structure", () => {
  beforeEach(() => {
    clearDomainCache();

    // Reset mock return values
    mockHandlers.computers.getTools.mockReturnValue([
      { name: "cwautomate_computers_list", description: "List computers" },
      { name: "cwautomate_computers_get", description: "Get computer" },
    ]);
    mockHandlers.clients.getTools.mockReturnValue([
      { name: "cwautomate_clients_list", description: "List clients" },
      { name: "cwautomate_clients_get", description: "Get client" },
    ]);
    mockHandlers.alerts.getTools.mockReturnValue([
      { name: "cwautomate_alerts_list", description: "List alerts" },
      { name: "cwautomate_alerts_get", description: "Get alert" },
    ]);
    mockHandlers.scripts.getTools.mockReturnValue([
      { name: "cwautomate_scripts_list", description: "List scripts" },
      { name: "cwautomate_scripts_get", description: "Get script" },
    ]);
  });

  it("computers domain should expose computer-specific tools", async () => {
    const handler = await getDomainHandler("computers");
    const tools = handler.getTools();

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("cwautomate_computers_list");
    expect(toolNames).toContain("cwautomate_computers_get");
  });

  it("clients domain should expose client-specific tools", async () => {
    const handler = await getDomainHandler("clients");
    const tools = handler.getTools();

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("cwautomate_clients_list");
    expect(toolNames).toContain("cwautomate_clients_get");
  });

  it("alerts domain should expose alert-specific tools", async () => {
    const handler = await getDomainHandler("alerts");
    const tools = handler.getTools();

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("cwautomate_alerts_list");
    expect(toolNames).toContain("cwautomate_alerts_get");
  });

  it("scripts domain should expose script-specific tools", async () => {
    const handler = await getDomainHandler("scripts");
    const tools = handler.getTools();

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("cwautomate_scripts_list");
    expect(toolNames).toContain("cwautomate_scripts_get");
  });
});
