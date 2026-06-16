/**
 * Tests for computers domain handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted
const {
  mockComputersList,
  mockComputersGet,
  mockComputersRestart,
  mockScriptsExecute,
  mockClient,
} = vi.hoisted(() => {
  const mockComputersList = vi.fn();
  const mockComputersGet = vi.fn();
  const mockComputersRestart = vi.fn();
  const mockScriptsExecute = vi.fn();

  const mockClient = {
    computers: {
      list: mockComputersList,
      get: mockComputersGet,
      restart: mockComputersRestart,
    },
    scripts: {
      execute: mockScriptsExecute,
    },
  };

  return {
    mockComputersList,
    mockComputersGet,
    mockComputersRestart,
    mockScriptsExecute,
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
import { computersHandler } from "../../domains/computers.js";

describe("Computers Domain Handler", () => {
  beforeEach(() => {
    // Clear call history
    mockComputersList.mockClear();
    mockComputersGet.mockClear();
    mockComputersRestart.mockClear();
    mockScriptsExecute.mockClear();

    // Reset mock implementations to the real API response shape
    mockComputersList.mockResolvedValue({
      TotalRecords: 2,
      Data: [
        { Id: 1, ComputerName: "Computer 1" },
        { Id: 2, ComputerName: "Computer 2" },
      ],
    });
    mockComputersGet.mockResolvedValue({
      Id: 1,
      ComputerName: "Computer 1",
      ClientId: 5,
    });
    mockComputersRestart.mockResolvedValue(undefined);
    mockScriptsExecute.mockResolvedValue({
      JobId: "abc",
      ScriptId: 100,
      ComputerIds: [1],
      Status: "Queued",
      QueuedDate: "2024-01-01T00:00:00Z",
    });
  });

  describe("getTools", () => {
    it("should return all computer tools", () => {
      const tools = computersHandler.getTools();

      expect(tools.length).toBe(5);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("cwautomate_computers_list");
      expect(toolNames).toContain("cwautomate_computers_get");
      expect(toolNames).toContain("cwautomate_computers_search");
      expect(toolNames).toContain("cwautomate_computers_reboot");
      expect(toolNames).toContain("cwautomate_computers_run_script");
    });

    it("cwautomate_computers_get should require computer_id", () => {
      const tools = computersHandler.getTools();
      const getTool = tools.find((t) => t.name === "cwautomate_computers_get");

      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("computer_id");
    });

    it("cwautomate_computers_search should require query", () => {
      const tools = computersHandler.getTools();
      const searchTool = tools.find(
        (t) => t.name === "cwautomate_computers_search"
      );

      expect(searchTool).toBeDefined();
      expect(searchTool?.inputSchema.required).toContain("query");
    });

    it("cwautomate_computers_reboot should require computer_id", () => {
      const tools = computersHandler.getTools();
      const rebootTool = tools.find(
        (t) => t.name === "cwautomate_computers_reboot"
      );

      expect(rebootTool).toBeDefined();
      expect(rebootTool?.inputSchema.required).toContain("computer_id");
    });

    it("cwautomate_computers_run_script should require computer_id and script_id", () => {
      const tools = computersHandler.getTools();
      const runScriptTool = tools.find(
        (t) => t.name === "cwautomate_computers_run_script"
      );

      expect(runScriptTool).toBeDefined();
      expect(runScriptTool?.inputSchema.required).toContain("computer_id");
      expect(runScriptTool?.inputSchema.required).toContain("script_id");
    });
  });

  describe("handleCall", () => {
    describe("cwautomate_computers_list", () => {
      it("should list computers with default parameters", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_list",
          {}
        );

        expect(result.isError).toBeUndefined();
        expect(result.content[0].type).toBe("text");

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(2);
        expect(data.computers).toHaveLength(2);
      });

      it("should map filters and online status to the library params", async () => {
        await computersHandler.handleCall("cwautomate_computers_list", {
          client_id: 5,
          status: "online",
          limit: 10,
        });

        expect(mockComputersList).toHaveBeenCalledWith({
          clientId: 5,
          locationId: undefined,
          pageSize: 10,
          page: undefined,
          isOnline: true,
        });
      });
    });

    describe("cwautomate_computers_get", () => {
      it("should get a single computer", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_get",
          {
            computer_id: 1,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.Id).toBe(1);
        expect(data.ComputerName).toBe("Computer 1");
      });
    });

    describe("cwautomate_computers_search", () => {
      it("should search computers via a name condition", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_search",
          {
            query: "Computer",
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(2);
        expect(data.computers).toHaveLength(2);

        expect(mockComputersList).toHaveBeenCalledWith({
          condition: "ComputerName like '%Computer%'",
          clientId: undefined,
          pageSize: 50,
        });
      });

      it("should pass search parameters to the list condition", async () => {
        await computersHandler.handleCall("cwautomate_computers_search", {
          query: "workstation",
          client_id: 5,
          limit: 25,
        });

        expect(mockComputersList).toHaveBeenCalledWith({
          condition: "ComputerName like '%workstation%'",
          clientId: 5,
          pageSize: 25,
        });
      });
    });

    describe("cwautomate_computers_reboot", () => {
      it("should reboot a computer via restart", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_reboot",
          {
            computer_id: 1,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(data.message).toContain("Reboot command sent");
        expect(mockComputersRestart).toHaveBeenCalledWith(1, undefined);
      });

      it("should pass the force parameter to restart", async () => {
        await computersHandler.handleCall("cwautomate_computers_reboot", {
          computer_id: 1,
          force: true,
        });

        expect(mockComputersRestart).toHaveBeenCalledWith(1, true);
      });
    });

    describe("cwautomate_computers_run_script", () => {
      it("should run a script on a computer via scripts.execute", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_run_script",
          {
            computer_id: 1,
            script_id: 100,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(data.message).toContain("Script 100 queued");
        expect(mockScriptsExecute).toHaveBeenCalledWith({
          ScriptId: 100,
          ComputerIds: [1],
          Parameters: undefined,
        });
      });

      it("should pass parameters to scripts.execute", async () => {
        await computersHandler.handleCall("cwautomate_computers_run_script", {
          computer_id: 1,
          script_id: 100,
          parameters: { arg1: "value1" },
        });

        expect(mockScriptsExecute).toHaveBeenCalledWith({
          ScriptId: 100,
          ComputerIds: [1],
          Parameters: { arg1: "value1" },
        });
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown tool", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown computer tool");
      });
    });
  });
});
