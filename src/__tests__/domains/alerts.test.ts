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

    // Reset mock implementations to the real API response shape:
    // Automate list endpoints return a bare JSON array (issue #35).
    mockAlertsList.mockResolvedValue([
      { Id: 1, Name: "Alert 1", Severity: 3 },
      { Id: 2, Name: "Alert 2", Severity: 1 },
    ]);
    mockAlertsGet.mockResolvedValue({
      Id: 1,
      Name: "Alert 1",
      Severity: 3,
      ComputerId: 5,
    });
    mockAlertsAcknowledge.mockResolvedValue({
      Count: 1,
      AcknowledgedAlertIds: [1],
    });
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

      it("should map filters to the library params", async () => {
        await alertsHandler.handleCall("cwautomate_alerts_list", {
          computer_id: 5,
          client_id: 10,
          status: "new",
          severity: 3,
          limit: 25,
        });

        expect(mockAlertsList).toHaveBeenCalledWith({
          computerId: 5,
          clientId: 10,
          status: "New",
          severity: 3,
          pageSize: 25,
          page: undefined,
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
        expect(data.Id).toBe(1);
        expect(data.Name).toBe("Alert 1");
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
        expect(mockAlertsAcknowledge).toHaveBeenCalledWith({
          AlertIds: [1],
          Notes: undefined,
        });
      });

      it("should pass the comment as Notes to the API", async () => {
        await alertsHandler.handleCall("cwautomate_alerts_acknowledge", {
          alert_id: 1,
          comment: "Issue resolved",
        });

        expect(mockAlertsAcknowledge).toHaveBeenCalledWith({
          AlertIds: [1],
          Notes: "Issue resolved",
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
