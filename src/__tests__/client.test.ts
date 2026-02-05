/**
 * Tests for lazy-loaded ConnectWise Automate client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCredentials, getClient, clearClient } from "../utils/client.js";

// Mock the node-connectwise-automate library
vi.mock("@asachs01/node-connectwise-automate", () => ({
  ConnectWiseAutomateClient: vi.fn().mockImplementation((config) => ({
    config,
    computers: {
      list: vi.fn(),
      get: vi.fn(),
      search: vi.fn(),
      reboot: vi.fn(),
      runScript: vi.fn(),
    },
    clients: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    alerts: {
      list: vi.fn(),
      get: vi.fn(),
      acknowledge: vi.fn(),
    },
    scripts: {
      list: vi.fn(),
      get: vi.fn(),
      execute: vi.fn(),
    },
    locations: {
      list: vi.fn(),
    },
  })),
}));

describe("ConnectWise Automate Client Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    clearClient();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearClient();
  });

  describe("getCredentials", () => {
    it("should return null when no credentials are set", () => {
      delete process.env.CW_AUTOMATE_SERVER_URL;
      delete process.env.CW_AUTOMATE_CLIENT_ID;
      delete process.env.CW_AUTOMATE_USERNAME;
      delete process.env.CW_AUTOMATE_PASSWORD;

      const creds = getCredentials();
      expect(creds).toBeNull();
    });

    it("should return null when server URL is missing", () => {
      delete process.env.CW_AUTOMATE_SERVER_URL;
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const creds = getCredentials();
      expect(creds).toBeNull();
    });

    it("should return null when client ID is missing", () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      delete process.env.CW_AUTOMATE_CLIENT_ID;
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const creds = getCredentials();
      expect(creds).toBeNull();
    });

    it("should return null when username is missing", () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      delete process.env.CW_AUTOMATE_USERNAME;
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const creds = getCredentials();
      expect(creds).toBeNull();
    });

    it("should return null when password is missing", () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      delete process.env.CW_AUTOMATE_PASSWORD;

      const creds = getCredentials();
      expect(creds).toBeNull();
    });

    it("should return credentials when all required fields are provided", () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const creds = getCredentials();
      expect(creds).toEqual({
        serverUrl: "https://automate.example.com",
        clientId: "test-client-id",
        username: "test-username",
        password: "test-password",
        twoFactorCode: undefined,
      });
    });

    it("should include 2FA code when provided", () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";
      process.env.CW_AUTOMATE_2FA_CODE = "123456";

      const creds = getCredentials();
      expect(creds).toEqual({
        serverUrl: "https://automate.example.com",
        clientId: "test-client-id",
        username: "test-username",
        password: "test-password",
        twoFactorCode: "123456",
      });
    });
  });

  describe("getClient", () => {
    it("should throw error when no credentials are configured", async () => {
      delete process.env.CW_AUTOMATE_SERVER_URL;
      delete process.env.CW_AUTOMATE_CLIENT_ID;
      delete process.env.CW_AUTOMATE_USERNAME;
      delete process.env.CW_AUTOMATE_PASSWORD;

      await expect(getClient()).rejects.toThrow(
        "No API credentials provided"
      );
    });

    it("should create client when valid credentials are provided", async () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const client = await getClient();
      expect(client).toBeDefined();
      expect(client.computers).toBeDefined();
      expect(client.clients).toBeDefined();
      expect(client.alerts).toBeDefined();
      expect(client.scripts).toBeDefined();
    });

    it("should return cached client on subsequent calls", async () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const client1 = await getClient();
      const client2 = await getClient();

      expect(client1).toBe(client2);
    });

    it("should create new client when credentials change", async () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id-1";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const client1 = await getClient();

      // Change credentials
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id-2";
      clearClient();

      const client2 = await getClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe("clearClient", () => {
    it("should clear cached client", async () => {
      process.env.CW_AUTOMATE_SERVER_URL = "https://automate.example.com";
      process.env.CW_AUTOMATE_CLIENT_ID = "test-client-id";
      process.env.CW_AUTOMATE_USERNAME = "test-username";
      process.env.CW_AUTOMATE_PASSWORD = "test-password";

      const client1 = await getClient();
      clearClient();
      const client2 = await getClient();

      expect(client1).not.toBe(client2);
    });
  });
});
