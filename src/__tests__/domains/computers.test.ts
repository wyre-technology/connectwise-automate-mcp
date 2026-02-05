/**
 * Tests for computers domain handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted
const {
  mockComputersList,
  mockComputersGet,
  mockComputersSearch,
  mockComputersReboot,
  mockComputersRunScript,
  mockClient,
} = vi.hoisted(() => {
  const mockComputersList = vi.fn();
  const mockComputersGet = vi.fn();
  const mockComputersSearch = vi.fn();
  const mockComputersReboot = vi.fn();
  const mockComputersRunScript = vi.fn();

  const mockClient = {
    computers: {
      list: mockComputersList,
      get: mockComputersGet,
      search: mockComputersSearch,
      reboot: mockComputersReboot,
      runScript: mockComputersRunScript,
    },
  };

  return {
    mockComputersList,
    mockComputersGet,
    mockComputersSearch,
    mockComputersReboot,
    mockComputersRunScript,
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
    mockComputersSearch.mockClear();
    mockComputersReboot.mockClear();
    mockComputersRunScript.mockClear();

    // Reset mock implementations
    mockComputersList.mockResolvedValue({
      total: 2,
      computers: [
        { id: 1, computerName: "Computer 1" },
        { id: 2, computerName: "Computer 2" },
      ],
    });
    mockComputersGet.mockResolvedValue({
      id: 1,
      computerName: "Computer 1",
      clientId: 5,
    });
    mockComputersSearch.mockResolvedValue({
      total: 1,
      computers: [{ id: 1, computerName: "Computer 1" }],
    });
    mockComputersReboot.mockResolvedValue({ success: true });
    mockComputersRunScript.mockResolvedValue({ jobId: 123 });
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

      it("should pass filters to API", async () => {
        await computersHandler.handleCall("cwautomate_computers_list", {
          client_id: 5,
          status: "online",
          limit: 10,
        });

        expect(mockComputersList).toHaveBeenCalledWith({
          clientId: 5,
          locationId: undefined,
          status: "online",
          pageSize: 10,
          skip: 0,
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
        expect(data.id).toBe(1);
        expect(data.computerName).toBe("Computer 1");
      });
    });

    describe("cwautomate_computers_search", () => {
      it("should search computers", async () => {
        const result = await computersHandler.handleCall(
          "cwautomate_computers_search",
          {
            query: "Computer",
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(1);
        expect(data.computers).toHaveLength(1);
      });

      it("should pass search parameters to API", async () => {
        await computersHandler.handleCall("cwautomate_computers_search", {
          query: "workstation",
          client_id: 5,
          limit: 25,
        });

        expect(mockComputersSearch).toHaveBeenCalledWith({
          query: "workstation",
          clientId: 5,
          pageSize: 25,
        });
      });
    });

    describe("cwautomate_computers_reboot", () => {
      it("should reboot a computer", async () => {
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
      });

      it("should pass force parameter to API", async () => {
        await computersHandler.handleCall("cwautomate_computers_reboot", {
          computer_id: 1,
          force: true,
        });

        expect(mockComputersReboot).toHaveBeenCalledWith(1, { force: true });
      });
    });

    describe("cwautomate_computers_run_script", () => {
      it("should run a script on a computer", async () => {
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
      });

      it("should pass parameters to API", async () => {
        await computersHandler.handleCall("cwautomate_computers_run_script", {
          computer_id: 1,
          script_id: 100,
          parameters: { arg1: "value1" },
        });

        expect(mockComputersRunScript).toHaveBeenCalledWith(1, 100, {
          parameters: { arg1: "value1" },
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
