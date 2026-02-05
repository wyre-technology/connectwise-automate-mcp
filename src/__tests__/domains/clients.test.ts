/**
 * Tests for clients domain handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted
const {
  mockClientsList,
  mockClientsGet,
  mockClientsCreate,
  mockClientsUpdate,
  mockLocationsList,
  mockClient,
} = vi.hoisted(() => {
  const mockClientsList = vi.fn();
  const mockClientsGet = vi.fn();
  const mockClientsCreate = vi.fn();
  const mockClientsUpdate = vi.fn();
  const mockLocationsList = vi.fn();

  const mockClient = {
    clients: {
      list: mockClientsList,
      get: mockClientsGet,
      create: mockClientsCreate,
      update: mockClientsUpdate,
    },
    locations: {
      list: mockLocationsList,
    },
  };

  return {
    mockClientsList,
    mockClientsGet,
    mockClientsCreate,
    mockClientsUpdate,
    mockLocationsList,
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
import { clientsHandler } from "../../domains/clients.js";

describe("Clients Domain Handler", () => {
  beforeEach(() => {
    // Clear call history
    mockClientsList.mockClear();
    mockClientsGet.mockClear();
    mockClientsCreate.mockClear();
    mockClientsUpdate.mockClear();
    mockLocationsList.mockClear();

    // Reset mock implementations
    mockClientsList.mockResolvedValue({
      total: 2,
      clients: [
        { id: 1, name: "Client 1" },
        { id: 2, name: "Client 2" },
      ],
    });
    mockClientsGet.mockResolvedValue({
      id: 1,
      name: "Client 1",
      city: "Test City",
    });
    mockClientsCreate.mockResolvedValue({
      id: 100,
      name: "New Client",
    });
    mockClientsUpdate.mockResolvedValue({
      id: 1,
      name: "Updated Client",
    });
    mockLocationsList.mockResolvedValue({
      locations: [
        { id: 1, name: "Main Office" },
        { id: 2, name: "Branch Office" },
      ],
    });
  });

  describe("getTools", () => {
    it("should return all client tools", () => {
      const tools = clientsHandler.getTools();

      expect(tools.length).toBe(4);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("cwautomate_clients_list");
      expect(toolNames).toContain("cwautomate_clients_get");
      expect(toolNames).toContain("cwautomate_clients_create");
      expect(toolNames).toContain("cwautomate_clients_update");
    });

    it("cwautomate_clients_get should require client_id", () => {
      const tools = clientsHandler.getTools();
      const getTool = tools.find((t) => t.name === "cwautomate_clients_get");

      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("client_id");
    });

    it("cwautomate_clients_create should require name", () => {
      const tools = clientsHandler.getTools();
      const createTool = tools.find(
        (t) => t.name === "cwautomate_clients_create"
      );

      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.required).toContain("name");
    });

    it("cwautomate_clients_update should require client_id", () => {
      const tools = clientsHandler.getTools();
      const updateTool = tools.find(
        (t) => t.name === "cwautomate_clients_update"
      );

      expect(updateTool).toBeDefined();
      expect(updateTool?.inputSchema.required).toContain("client_id");
    });
  });

  describe("handleCall", () => {
    describe("cwautomate_clients_list", () => {
      it("should list clients with default parameters", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_list",
          {}
        );

        expect(result.isError).toBeUndefined();
        expect(result.content[0].type).toBe("text");

        const data = JSON.parse(result.content[0].text);
        expect(data.total).toBe(2);
        expect(data.clients).toHaveLength(2);
      });

      it("should pass pagination to API", async () => {
        await clientsHandler.handleCall("cwautomate_clients_list", {
          limit: 10,
          skip: 20,
        });

        expect(mockClientsList).toHaveBeenCalledWith({
          pageSize: 10,
          skip: 20,
        });
      });
    });

    describe("cwautomate_clients_get", () => {
      it("should get a single client", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_get",
          {
            client_id: 1,
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.id).toBe(1);
        expect(data.name).toBe("Client 1");
      });

      it("should include locations when requested", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_get",
          {
            client_id: 1,
            include_locations: true,
          }
        );

        const data = JSON.parse(result.content[0].text);
        expect(data.locations).toBeDefined();
        expect(data.locations).toHaveLength(2);
      });
    });

    describe("cwautomate_clients_create", () => {
      it("should create a client with required fields", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_create",
          {
            name: "New Client",
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.id).toBe(100);
        expect(data.name).toBe("New Client");
      });

      it("should pass all fields to API", async () => {
        await clientsHandler.handleCall("cwautomate_clients_create", {
          name: "New Client",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "USA",
          phone: "555-1234",
          email: "test@example.com",
        });

        expect(mockClientsCreate).toHaveBeenCalledWith({
          name: "New Client",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "USA",
          phone: "555-1234",
          email: "test@example.com",
        });
      });
    });

    describe("cwautomate_clients_update", () => {
      it("should update a client", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_update",
          {
            client_id: 1,
            name: "Updated Client",
          }
        );

        expect(result.isError).toBeUndefined();

        const data = JSON.parse(result.content[0].text);
        expect(data.name).toBe("Updated Client");
      });

      it("should pass update fields to API", async () => {
        await clientsHandler.handleCall("cwautomate_clients_update", {
          client_id: 1,
          name: "Updated",
          city: "New City",
        });

        expect(mockClientsUpdate).toHaveBeenCalledWith(1, {
          name: "Updated",
          city: "New City",
          state: undefined,
          zip: undefined,
          country: undefined,
          phone: undefined,
          email: undefined,
        });
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown tool", async () => {
        const result = await clientsHandler.handleCall(
          "cwautomate_clients_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown client tool");
      });
    });
  });
});
