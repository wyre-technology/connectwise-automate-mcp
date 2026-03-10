#!/usr/bin/env node
/**
 * ConnectWise Automate MCP Server with Decision Tree Architecture
 *
 * This MCP server uses a hierarchical tool loading approach:
 * 1. Initially exposes only a navigation tool
 * 2. After user selects a domain, exposes domain-specific tools
 * 3. Lazy-loads domain handlers and the ConnectWise Automate client
 *
 * Supports both stdio and HTTP transports:
 * - stdio: Default, for local MCP clients
 * - http: For gateway/hosted deployments (set MCP_TRANSPORT=http)
 *
 * Credentials are provided via environment variables:
 * - CW_AUTOMATE_SERVER_URL
 * - CW_AUTOMATE_CLIENT_ID
 * - CW_AUTOMATE_USERNAME
 * - CW_AUTOMATE_PASSWORD
 * - CW_AUTOMATE_2FA_CODE (optional)
 *
 * In gateway mode (AUTH_MODE=gateway), credentials are extracted from HTTP headers:
 * - X-CWA-Server -> CW_AUTOMATE_SERVER_URL
 * - X-CWA-Client-ID -> CW_AUTOMATE_CLIENT_ID
 * - X-CWA-Username -> CW_AUTOMATE_USERNAME
 * - X-CWA-Password -> CW_AUTOMATE_PASSWORD
 * - X-CWA-2FA -> CW_AUTOMATE_2FA_CODE (optional)
 */

import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getDomainHandler, getAvailableDomains } from "./domains/index.js";
import { isDomainName, type DomainName } from "./utils/types.js";
import { getCredentials, clearClient } from "./utils/client.js";
import { setServerRef } from "./utils/server-ref.js";

// Server state
let currentDomain: DomainName | null = null;

// HTTP server reference for graceful shutdown
let httpServer: HttpServer | undefined;

// Create the MCP server
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
 * Get tools based on current navigation state
 */
async function getToolsForState(): Promise<Tool[]> {
  // Always include status tool
  const tools: Tool[] = [statusTool];

  if (currentDomain === null) {
    // At the root - show navigation tool
    tools.unshift(navigateTool);
  } else {
    // In a domain - show back tool and domain-specific tools
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
      const creds = getCredentials();
      if (!creds) {
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
      const creds = getCredentials();
      const credStatus = creds
        ? `Configured (server: ${creds.serverUrl})`
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

      // Check if the tool belongs to this domain
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
  }
});

/**
 * Start the server with stdio transport (default)
 */
async function startStdioTransport(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "ConnectWise Automate MCP server running on stdio (decision tree mode)"
  );
}

/**
 * Start the server with HTTP Streamable transport
 * Supports gateway mode where credentials come from request headers
 */
async function startHttpTransport(): Promise<void> {
  const port = parseInt(process.env.MCP_HTTP_PORT || "8080", 10);
  const host = process.env.MCP_HTTP_HOST || "0.0.0.0";
  const isGatewayMode = process.env.AUTH_MODE === "gateway";

  const httpTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
  });

  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

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

    // MCP endpoint
    if (url.pathname === "/mcp") {
      // In gateway mode, extract credentials from headers
      if (isGatewayMode) {
        const headers = req.headers as Record<string, string | string[] | undefined>;
        const cwaServer = headers["x-cwa-server"] as string | undefined;
        const cwaClientId = headers["x-cwa-client-id"] as string | undefined;
        const cwaUsername = headers["x-cwa-username"] as string | undefined;
        const cwaPassword = headers["x-cwa-password"] as string | undefined;
        const cwa2fa = headers["x-cwa-2fa"] as string | undefined;

        if (!cwaServer || !cwaClientId || !cwaUsername || !cwaPassword) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Missing credentials",
              message:
                "Gateway mode requires X-CWA-Server, X-CWA-Client-ID, X-CWA-Username, and X-CWA-Password headers",
              required: [
                "X-CWA-Server",
                "X-CWA-Client-ID",
                "X-CWA-Username",
                "X-CWA-Password",
              ],
            })
          );
          return;
        }

        // Set process.env so getCredentials() picks them up
        process.env.CW_AUTOMATE_SERVER_URL = cwaServer;
        process.env.CW_AUTOMATE_CLIENT_ID = cwaClientId;
        process.env.CW_AUTOMATE_USERNAME = cwaUsername;
        process.env.CW_AUTOMATE_PASSWORD = cwaPassword;
        if (cwa2fa) {
          process.env.CW_AUTOMATE_2FA_CODE = cwa2fa;
        }

        // Invalidate cached client so new credentials take effect
        clearClient();
      }

      httpTransport.handleRequest(req, res);
      return;
    }

    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", endpoints: ["/mcp", "/health"] }));
  });

  await server.connect(httpTransport as unknown as Transport);

  await new Promise<void>((resolve) => {
    httpServer!.listen(port, host, () => {
      console.error(
        `ConnectWise Automate MCP server listening on http://${host}:${port}/mcp`
      );
      console.error(`Health check available at http://${host}:${port}/health`);
      console.error(
        `Authentication mode: ${isGatewayMode ? "gateway (header-based)" : "env (environment variables)"}`
      );
      resolve();
    });
  });
}

/**
 * Gracefully stop the server
 */
async function shutdown(): Promise<void> {
  console.error("Shutting down ConnectWise Automate MCP server...");
  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer!.close((err) => (err ? reject(err) : resolve()));
    });
  }
  await server.close();
  process.exit(0);
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

// Graceful shutdown handlers
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("Failed to start ConnectWise Automate MCP server:", error);
  process.exit(1);
});

// Export for testing
export { server, startHttpTransport, startStdioTransport };
