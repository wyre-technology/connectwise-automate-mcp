#!/usr/bin/env node
/**
 * ConnectWise Automate MCP Server with Decision Tree Architecture
 *
 * This MCP server uses a hierarchical tool loading approach:
 * 1. Initially exposes only a navigation tool
 * 2. After user selects a domain, exposes domain-specific tools
 * 3. Lazy-loads domain handlers and the ConnectWise Automate client
 *
 * Supports both stdio and HTTP (StreamableHTTP) transports.
 * - stdio: credentials via environment variables
 * - HTTP: credentials via env vars (AUTH_MODE=env) or per-request headers (AUTH_MODE=gateway)
 *
 * Gateway header mapping (from vendor-config.ts):
 *   X-CWA-Server    -> serverUrl
 *   X-CWA-Client-ID -> clientId
 *   X-CWA-Username  -> username
 *   X-CWA-Password  -> password
 *   X-CWA-2FA       -> twoFactorCode (optional)
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getDomainHandler, getAvailableDomains } from "./domains/index.js";
import { isDomainName, type DomainName } from "./utils/types.js";
import {
  getCredentials,
  hasCredentials,
  createClientDirect,
  setClientOverride,
  clearClientOverride,
  type CWAutomateCredentials,
} from "./utils/client.js";
import { setServerRef } from "./utils/server-ref.js";

/**
 * Navigation tool - always available
 */
const navigateTool: Tool = {
  name: "cwautomate_navigate",
  description:
    "Navigate to a ConnectWise Automate domain to access its tools. Available domains: computers (manage endpoints), clients (manage companies), alerts (view and acknowledge alerts), scripts (manage and execute scripts).",
  inputSchema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        enum: getAvailableDomains(),
        description:
          "The domain to navigate to. Choose: computers, clients, alerts, or scripts",
      },
    },
    required: ["domain"],
  },
};

/**
 * Back navigation tool - available when in a domain
 */
const backTool: Tool = {
  name: "cwautomate_back",
  description: "Navigate back to the main menu to select a different domain",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

/**
 * Status tool - shows current navigation state
 */
const statusTool: Tool = {
  name: "cwautomate_status",
  description:
    "Show current navigation state and available domains. Also verifies API credentials are configured.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

/**
 * Create a fresh MCP server instance with all handlers registered.
 * Called once for stdio, or per-request for HTTP transport.
 *
 * @param credentialOverrides - Optional credentials for gateway mode.
 *   When provided, a per-request client is created from these credentials
 *   instead of reading from process.env.
 */
function createMcpServer(credentialOverrides?: CWAutomateCredentials): Server {
  // Server state scoped to this instance
  let currentDomain: DomainName | null = null;

  const server = new Server(
    {
      name: "connectwise-automate-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  setServerRef(server);

  /**
   * Get tools based on current navigation state
   */
  async function getToolsForState(): Promise<Tool[]> {
    const tools: Tool[] = [statusTool];

    if (currentDomain === null) {
      tools.unshift(navigateTool);
    } else {
      tools.unshift(backTool);
      const handler = await getDomainHandler(currentDomain);
      const domainTools = handler.getTools();
      tools.push(...domainTools);
    }

    return tools;
  }

  // Handle ListTools requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await getToolsForState();
    return { tools };
  });

  // Handle CallTool requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // If per-request credentials were provided, create an isolated client
    // and set it as the override so all domain handlers pick it up via getClient().
    if (credentialOverrides) {
      const directClient = await createClientDirect(credentialOverrides);
      setClientOverride(directClient);
    }

    try {
      // Handle navigation
      if (name === "cwautomate_navigate") {
        const domain = (args as { domain: string }).domain;

        if (!isDomainName(domain)) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid domain: ${domain}. Available domains: ${getAvailableDomains().join(", ")}`,
              },
            ],
            isError: true,
          };
        }

        // Check credentials before navigating
        if (!hasCredentials(credentialOverrides)) {
          return {
            content: [
              {
                type: "text",
                text: "Error: No API credentials configured. Please set CW_AUTOMATE_SERVER_URL, CW_AUTOMATE_CLIENT_ID, CW_AUTOMATE_USERNAME, and CW_AUTOMATE_PASSWORD environment variables.",
              },
            ],
            isError: true,
          };
        }

        currentDomain = domain;

        // Get tools for the new domain
        const handler = await getDomainHandler(domain);
        const domainTools = handler.getTools();

        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${domain} domain.\n\nAvailable tools:\n${domainTools
                .map((t) => `- ${t.name}: ${t.description}`)
                .join("\n")}\n\nUse cwautomate_back to return to the main menu.`,
            },
          ],
        };
      }

      // Handle back navigation
      if (name === "cwautomate_back") {
        const previousDomain = currentDomain;
        currentDomain = null;

        return {
          content: [
            {
              type: "text",
              text: `Navigated back from ${previousDomain || "root"} to the main menu.\n\nAvailable domains: ${getAvailableDomains().join(", ")}\n\nUse cwautomate_navigate to select a domain.`,
            },
          ],
        };
      }

      // Handle status
      if (name === "cwautomate_status") {
        const hasCreds = hasCredentials(credentialOverrides);
        const envCreds = getCredentials();
        const credStatus = hasCreds
          ? credentialOverrides
            ? `Configured (gateway mode, server: ${credentialOverrides.serverUrl})`
            : `Configured (server: ${envCreds?.serverUrl})`
          : "NOT CONFIGURED - Please set environment variables";

        return {
          content: [
            {
              type: "text",
              text: `ConnectWise Automate MCP Server Status\n\nCurrent domain: ${currentDomain || "(none - at main menu)"}\nCredentials: ${credStatus}\nAvailable domains: ${getAvailableDomains().join(", ")}`,
            },
          ],
        };
      }

      // Handle domain-specific tools
      if (currentDomain !== null) {
        const handler = await getDomainHandler(currentDomain);
        const domainTools = handler.getTools();
        const toolExists = domainTools.some((t) => t.name === name);

        if (toolExists) {
          return await handler.handleCall(name, args as Record<string, unknown>);
        }
      }

      // Tool not found
      return {
        content: [
          {
            type: "text",
            text: currentDomain
              ? `Unknown tool: ${name}. You are currently in the ${currentDomain} domain. Use cwautomate_back to return to the main menu.`
              : `Unknown tool: ${name}. Use cwautomate_navigate to select a domain first.`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    } finally {
      if (credentialOverrides) {
        clearClientOverride();
      }
    }
  });

  return server;
}

/**
 * Start the server with stdio transport (default)
 */
async function startStdioTransport(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "ConnectWise Automate MCP server running on stdio (decision tree mode)"
  );
}

/**
 * Start the server with HTTP Streamable transport.
 * In gateway mode, credentials are extracted from request headers on each request.
 * No process.env mutation -- each request gets its own isolated client.
 */
async function startHttpTransport(): Promise<void> {
  const port = parseInt(process.env.MCP_HTTP_PORT || "8080", 10);
  const host = process.env.MCP_HTTP_HOST || "0.0.0.0";
  const isGatewayMode = process.env.AUTH_MODE === "gateway";

  const httpServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`
      );

      // Health endpoint - no auth required
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            transport: "http",
            authMode: isGatewayMode ? "gateway" : "env",
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // MCP endpoint -- create a new Server + Transport per request so that
      // each initialize handshake gets a fresh server (the MCP SDK rejects
      // initialize on an already-initialized server).
      if (url.pathname === "/mcp") {
        console.error(
          `[MCP] ${req.method} /mcp from ${req.headers["x-forwarded-for"] || req.socket.remoteAddress}` +
            ` hasServer=${!!req.headers["x-cwa-server"]}` +
            ` hasClientId=${!!req.headers["x-cwa-client-id"]}`
        );

        // In gateway mode, extract per-request credentials from headers
        // and pass them directly to createMcpServer() for isolation.
        // No process.env mutation -- each request gets its own client.
        let credentialOverrides: CWAutomateCredentials | undefined;
        if (isGatewayMode) {
          const serverUrl = req.headers["x-cwa-server"] as string | undefined;
          const clientId = req.headers["x-cwa-client-id"] as string | undefined;
          const username = req.headers["x-cwa-username"] as string | undefined;
          const password = req.headers["x-cwa-password"] as string | undefined;
          const twoFactorCode = req.headers["x-cwa-2fa"] as string | undefined;

          if (serverUrl && clientId && username && password) {
            credentialOverrides = { serverUrl, clientId, username, password };
            if (twoFactorCode) {
              credentialOverrides.twoFactorCode = twoFactorCode;
            }
          }
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        const server = createMcpServer(credentialOverrides);

        res.on("close", () => {
          transport.close();
          server.close();
        });

        server
          .connect(transport)
          .then(() => {
            transport.handleRequest(req, res);
          })
          .catch((err) => {
            console.error("[MCP] transport error:", err);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32603, message: "Internal error" },
                  id: null,
                })
              );
            }
          });
        return;
      }

      // 404 for everything else
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Not found",
          endpoints: ["/mcp", "/health"],
        })
      );
    }
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      console.error(
        `ConnectWise Automate MCP server listening on http://${host}:${port}/mcp`
      );
      console.error(
        `Health check available at http://${host}:${port}/health`
      );
      console.error(
        `Authentication mode: ${isGatewayMode ? "gateway (header-based)" : "env (environment variables)"}`
      );
      resolve();
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.error("Shutting down ConnectWise Automate MCP server...");
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Start the server
async function main() {
  const transportType = process.env.MCP_TRANSPORT || "stdio";

  if (transportType === "http") {
    await startHttpTransport();
  } else {
    await startStdioTransport();
  }
}

main().catch((error) => {
  console.error("Failed to start ConnectWise Automate MCP server:", error);
  process.exit(1);
});

// Export for testing
export { createMcpServer, startHttpTransport, startStdioTransport };
