/**
 * Tests for alerts domain handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted
const { mockAlertsList, mockAlertsGet, mockAlertsAcknowledge, mockClient } =
  vi.hoisted(() => {
    const mockAlertsList = vi.fn();
    const mockAlertsGet = vi.fn();
    const mockAlertsAcknowledge = vi.fn();

    const mockClient = {
      alerts: {
        list: mockAlertsList,
        get: mockAlertsGet,
        acknowledge: mockAlertsAcknowledge,
      },
    };

    return {
      mockAlertsList,
      mockAlertsGet,
      mockAlertsAcknowledge,
      mockClient,
    };
  });

// Mock the client module before importing the handler
vi.mock("../../utils/client.js", () => ({
  getClient: () => Promise.resolve(mockClient),
  clearClient: vi.fn(),
  getCredentials: () => ({
    serverUrl: "https://automate.example.com",
    clientId: "test-client-id",
    username: "test-username",
    password: "test-password",
  }),
}));

// Import handler after mocking
import { alertsHandler } from "../../domains/alerts.js";

describe("Alerts Domain Handler", () => {
  beforeEach(() => {
    // Clear call history
    mockAlertsList.mockClear();
    mockAlertsGet.mockClear();
    mockAlertsAcknowledge.mockClear();

    // Reset mock implementations
    mockAlertsList.mockResolvedValue({
      total: 2,
      alerts: [
        { id: 1, message: "Alert 1", severity: "warning" },
        { id: 2, message: "Alert 2", severity: "critical" },
      ],
    });
    mockAlertsGet.mockResolvedValue({
      id: 1,
      message: "Alert 1",
      severity: "warning",
      computerId: 5,
    });
    mockAlertsAcknowledge.mockResolvedValue({ success: true });
  });

  describe("getTools", () => {
    it("should return all alert tools", () => {
      const tools = alertsHandler.getTools();

      expect(tools.length).toBe(3);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("cwautomate_alerts_list");
      expect(toolNames).toContain("cwautomate_alerts_get");
      expect(toolNames).toContain("cwautomate_alerts_acknowledge");
    });

    it("cwautomate_alerts_get should require alert_id", () => {
      const tools = alertsHandler.getTools();
      const getTool = tools.find((t) => t.name === "cwautomate_alerts_get");

      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("alert_id");
    });

    it("cwautomate_alerts_acknowledge should require alert_id", () => {
      const tools = alertsHandler.getTools();
      const acknowledgeTool = tools.find(
        (t) => t.name === "cwautomate_alerts_acknowledge"
      );

      expect(acknowledgeTool).toBeDefined();
      expect(acknowledgeTool?.inputSchema.required).toContain("alert_id");
    });
  });

  describe("handleCall", () => {
    describe("cwautomate_alerts_list", () => {
      it("should list alerts with default parameters", async () => {
        const result = await alertsHandler.handleCall(
          "cwautomate_alerts_list",
          {}
        );

        expect(result.isError).toBeUndefined();
        expect(result.content[0].type).toBe("text");

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(2);
        expect(data.alerts).toHaveLength(2);
      });

      it("should pass filters to API", async () => {
        await alertsHandler.handleCall("cwautomate_alerts_list", {
          computer_id: 5,
          client_id: 10,
          status: "active",
          severity: "critical",
          limit: 25,
        });

        expect(mockAlertsList).toHaveBeenCalledWith({
          computerId: 5,
          clientId: 10,
          status: "active",
          severity: "critical",
          pageSize: 25,
          skip: 0,
        });
      });
    });

    describe("cwautomate_alerts_get", () => {
      it("should get a single alert", async () => {
        const result = await alertsHandler.handleCall("cwautomate_alerts_get", {
          alert_id: 1,
        });

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.id).toBe(1);
        expect(data.message).toBe("Alert 1");
      });
    });

    describe("cwautomate_alerts_acknowledge", () => {
      it("should acknowledge an alert", async () => {
        const result = await alertsHandler.handleCall(
          "cwautomate_alerts_acknowledge",
          {
            alert_id: 1,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(data.message).toContain("Alert 1 acknowledged");
      });

      it("should pass comment to API", async () => {
        await alertsHandler.handleCall("cwautomate_alerts_acknowledge", {
          alert_id: 1,
          comment: "Issue resolved",
        });

        expect(mockAlertsAcknowledge).toHaveBeenCalledWith(1, {
          comment: "Issue resolved",
        });
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown tool", async () => {
        const result = await alertsHandler.handleCall(
          "cwautomate_alerts_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown alert tool");
      });
    });
  });
});
