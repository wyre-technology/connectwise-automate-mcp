/**
 * Tests for scripts domain handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted
const { mockScriptsList, mockScriptsGet, mockScriptsExecute, mockClient } =
  vi.hoisted(() => {
    const mockScriptsList = vi.fn();
    const mockScriptsGet = vi.fn();
    const mockScriptsExecute = vi.fn();

    const mockClient = {
      scripts: {
        list: mockScriptsList,
        get: mockScriptsGet,
        execute: mockScriptsExecute,
      },
    };

    return {
      mockScriptsList,
      mockScriptsGet,
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
import { scriptsHandler } from "../../domains/scripts.js";

describe("Scripts Domain Handler", () => {
  beforeEach(() => {
    // Clear call history
    mockScriptsList.mockClear();
    mockScriptsGet.mockClear();
    mockScriptsExecute.mockClear();

    // Reset mock implementations to the real API response shape
    mockScriptsList.mockResolvedValue({
      TotalRecords: 2,
      Data: [
        { Id: 1, Name: "Script 1" },
        { Id: 2, Name: "Script 2" },
      ],
    });
    mockScriptsGet.mockResolvedValue({
      Id: 1,
      Name: "Script 1",
      Description: "Test script",
    });
    mockScriptsExecute.mockResolvedValue({
      JobId: "abc",
      ScriptId: 1,
      ComputerIds: [1],
      Status: "Queued",
      QueuedDate: "2024-01-01T00:00:00Z",
    });
  });

  describe("getTools", () => {
    it("should return all script tools", () => {
      const tools = scriptsHandler.getTools();

      expect(tools.length).toBe(3);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("cwautomate_scripts_list");
      expect(toolNames).toContain("cwautomate_scripts_get");
      expect(toolNames).toContain("cwautomate_scripts_execute");
    });

    it("cwautomate_scripts_get should require script_id", () => {
      const tools = scriptsHandler.getTools();
      const getTool = tools.find((t) => t.name === "cwautomate_scripts_get");

      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("script_id");
    });

    it("cwautomate_scripts_execute should require script_id and computer_ids", () => {
      const tools = scriptsHandler.getTools();
      const executeTool = tools.find(
        (t) => t.name === "cwautomate_scripts_execute"
      );

      expect(executeTool).toBeDefined();
      expect(executeTool?.inputSchema.required).toContain("script_id");
      expect(executeTool?.inputSchema.required).toContain("computer_ids");
    });
  });

  describe("handleCall", () => {
    describe("cwautomate_scripts_list", () => {
      it("should list scripts with default parameters", async () => {
        const result = await scriptsHandler.handleCall(
          "cwautomate_scripts_list",
          {}
        );

        expect(result.isError).toBeUndefined();
        expect(result.content[0].type).toBe("text");

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(2);
        expect(data.scripts).toHaveLength(2);
      });

      it("should map search to the name filter", async () => {
        await scriptsHandler.handleCall("cwautomate_scripts_list", {
          folder_id: 5,
          search: "install",
          limit: 25,
        });

        expect(mockScriptsList).toHaveBeenCalledWith({
          folderId: 5,
          name: "install",
          pageSize: 25,
          page: undefined,
        });
      });
    });

    describe("cwautomate_scripts_get", () => {
      it("should get a single script", async () => {
        const result = await scriptsHandler.handleCall(
          "cwautomate_scripts_get",
          {
            script_id: 1,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.Id).toBe(1);
        expect(data.Name).toBe("Script 1");
        expect(mockScriptsGet).toHaveBeenCalledWith(1);
      });
    });

    describe("cwautomate_scripts_execute", () => {
      it("should execute a script on specific computers", async () => {
        const result = await scriptsHandler.handleCall(
          "cwautomate_scripts_execute",
          {
            script_id: 1,
            computer_ids: [1, 2, 3],
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(data.message).toContain("Script 1 queued");
        expect(data.message).toContain("3 computer(s)");
      });

      it("should map parameters and priority to the library shape", async () => {
        await scriptsHandler.handleCall("cwautomate_scripts_execute", {
          script_id: 1,
          computer_ids: [1, 2],
          parameters: { arg1: "value1" },
          priority: "high",
        });

        expect(mockScriptsExecute).toHaveBeenCalledWith({
          ScriptId: 1,
          ComputerIds: [1, 2],
          Parameters: { arg1: "value1" },
          Priority: 1,
        });
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown tool", async () => {
        const result = await scriptsHandler.handleCall(
          "cwautomate_scripts_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown script tool");
      });
    });
  });
});
