#!/usr/bin/env node
/**
 * ConnectWise Automate MCP Server
 *
 * This MCP server provides tools for interacting with the ConnectWise Automate API.
 * All tools are listed upfront so they work with every MCP client, including
 * remote connectors (claude.ai, mcp-remote) that do not support dynamic
 * tool-list changes. A helper `cwautomate_navigate` tool provides domain
 * discovery and guidance.
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
 * Domain metadata for navigation
 */
const domainDescriptions: Record<DomainName, string> = {
  computers: "Endpoint management - list, get, manage computers and devices in ConnectWise Automate",
  clients: "Company management - list and get client/company information and relationships",
  alerts: "Alert monitoring - view and acknowledge system alerts and notifications",
  scripts: "Script management - list, get, and execute automation scripts (DESTRUCTIVE operations available)",
};

/**
 * Navigation / discovery tool - helps the LLM find the right tools
 *
 * This is a stateless helper that describes available tools for a domain.
 * All domain tools are always listed in tools/list regardless of navigation
 * state, because many MCP clients (claude.ai connectors, mcp-remote) only
 * fetch the tool list once and do not support notifications/tools/list_changed.
 */
const navigateTool: Tool = {
  name: "cwautomate_navigate",
  description:
    "Discover available ConnectWise Automate tools by domain. Returns tool names and descriptions for the selected domain. All tools are callable at any time — this is a help/discovery aid, not a prerequisite.",
  inputSchema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        enum: getAvailableDomains(),
        description: `The domain to explore:
- computers: ${domainDescriptions.computers}
- clients: ${domainDescriptions.clients}
- alerts: ${domainDescriptions.alerts}
- scripts: ${domainDescriptions.scripts}`,
      },
    },
    required: ["domain"],
  },
};

/**
 * Status tool - shows credentials status and available domains
 */
const statusTool: Tool = {
  name: "cwautomate_status",
  description: "Show credentials status and available domains",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

/**
 * Map from domain name to its tool definitions (loaded lazily)
 */
const domainToolMap = new Map<DomainName, Tool[]>();

/**
 * All domain tools, collected once at startup
 */
let allDomainTools: Tool[] | null = null;

/**
 * Load all domain tools (lazy-loaded on first access)
 */
async function getAllDomainTools(): Promise<Tool[]> {
  if (allDomainTools !== null) {
    return allDomainTools;
  }

  const domains = getAvailableDomains();
  const tools: Tool[] = [];

  for (const domain of domains) {
    if (!domainToolMap.has(domain)) {
      const handler = await getDomainHandler(domain);
      const domainTools = handler.getTools();
      domainToolMap.set(domain, domainTools);
    }
    tools.push(...domainToolMap.get(domain)!);
  }

  allDomainTools = tools;
  return tools;
}

/**
 * Create a fresh MCP server instance with all handlers registered.
 * Called once for stdio, or per-request for HTTP transport.
 *
 * @param credentialOverrides - Optional credentials for gateway mode.
 *   When provided, a per-request client is created from these credentials
 *   instead of reading from process.env.
 */
function createMcpServer(credentialOverrides?: CWAutomateCredentials): Server {
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
   * Handle ListTools requests - always returns ALL tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const domainTools = await getAllDomainTools();
    return { tools: [navigateTool, statusTool, ...domainTools] };
  });

  /**
   * Handle CallTool requests
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // If per-request credentials were provided, create an isolated client
    // and set it as the override so all domain handlers pick it up via getClient().
    if (credentialOverrides) {
      const directClient = await createClientDirect(credentialOverrides);
      setClientOverride(directClient);
    }

    try {
      // Handle navigation / discovery helper
      if (name === "cwautomate_navigate") {
        const { domain } = args as { domain: DomainName };

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

        const handler = await getDomainHandler(domain);
        const tools = handler.getTools();

        const toolSummary = tools
          .map((t) => `- ${t.name}: ${t.description}`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `${domainDescriptions[domain]}\n\nAvailable tools:\n${toolSummary}\n\nYou can call any of these tools directly.`,
            },
          ],
        };
      }

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
              text: `ConnectWise Automate MCP Server Status\n\nCredentials: ${credStatus}\nAvailable domains: ${getAvailableDomains().join(", ")}\n\nAll tools are available at all times. Use cwautomate_navigate to discover tools by domain.`,
            },
          ],
        };
      }

      // Route to appropriate domain handler
      const toolArgs = (args ?? {}) as Record<string, unknown>;

      if (name.startsWith("cwautomate_computers_")) {
        const handler = await getDomainHandler("computers");
        return await handler.handleCall(name, toolArgs);
      }
      if (name.startsWith("cwautomate_clients_")) {
        const handler = await getDomainHandler("clients");
        return await handler.handleCall(name, toolArgs);
      }
      if (name.startsWith("cwautomate_alerts_")) {
        const handler = await getDomainHandler("alerts");
        return await handler.handleCall(name, toolArgs);
      }
      if (name.startsWith("cwautomate_scripts_")) {
        const handler = await getDomainHandler("scripts");
        return await handler.handleCall(name, toolArgs);
      }

      // Unknown tool
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}. Use cwautomate_navigate to discover available tools by domain.`,
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
    "ConnectWise Automate MCP server running on stdio"
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
