/**
 * Computers domain handler
 *
 * Provides tools for computer operations in ConnectWise Automate.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { DomainHandler, CallToolResult } from "../utils/types.js";
import { getClient } from "../utils/client.js";

/**
 * Get computer domain tools
 */
function getTools(): Tool[] {
  return [
    {
      name: "cwautomate_computers_list",
      description:
        "List computers in ConnectWise Automate. Can filter by client, location, or status.",
      inputSchema: {
        type: "object" as const,
        properties: {
          client_id: {
            type: "number",
            description: "Filter computers by client ID",
          },
          location_id: {
            type: "number",
            description: "Filter computers by location ID",
          },
          status: {
            type: "string",
            enum: ["online", "offline", "all"],
            description: "Filter by online status (default: all)",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 50)",
          },
          skip: {
            type: "number",
            description: "Number of results to skip for pagination",
          },
        },
      },
    },
    {
      name: "cwautomate_computers_get",
      description: "Get details for a specific computer by its ID",
      inputSchema: {
        type: "object" as const,
        properties: {
          computer_id: {
            type: "number",
            description: "The computer ID",
          },
        },
        required: ["computer_id"],
      },
    },
    {
      name: "cwautomate_computers_search",
      description: "Search for computers by name, MAC address, or other criteria",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search query (computer name, MAC address, etc.)",
          },
          client_id: {
            type: "number",
            description: "Limit search to a specific client",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 50)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "cwautomate_computers_reboot",
      description: "Send a reboot command to a computer",
      inputSchema: {
        type: "object" as const,
        properties: {
          computer_id: {
            type: "number",
            description: "The computer ID to reboot",
          },
          force: {
            type: "boolean",
            description: "Force reboot even if users are logged in",
          },
        },
        required: ["computer_id"],
      },
    },
    {
      name: "cwautomate_computers_run_script",
      description: "Run a script on a specific computer",
      inputSchema: {
        type: "object" as const,
        properties: {
          computer_id: {
            type: "number",
            description: "The computer ID to run the script on",
          },
          script_id: {
            type: "number",
            description: "The script ID to execute",
          },
          parameters: {
            type: "object",
            description: "Script parameters as key-value pairs",
            additionalProperties: { type: "string" },
          },
        },
        required: ["computer_id", "script_id"],
      },
    },
  ];
}

/**
 * Handle a computer domain tool call
 */
async function handleCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case "cwautomate_computers_list": {
      const limit = (args.limit as number) || 50;
      const skip = (args.skip as number) || 0;
      const response = await client.computers.list({
        clientId: args.client_id as number | undefined,
        locationId: args.location_id as number | undefined,
        status: args.status as "online" | "offline" | "all" | undefined,
        pageSize: limit,
        skip,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: response.total,
                computers: response.computers,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_computers_get": {
      const computerId = args.computer_id as number;
      const computer = await client.computers.get(computerId);

      return {
        content: [{ type: "text", text: JSON.stringify(computer, null, 2) }],
      };
    }

    case "cwautomate_computers_search": {
      const query = args.query as string;
      const limit = (args.limit as number) || 50;
      const response = await client.computers.search({
        query,
        clientId: args.client_id as number | undefined,
        pageSize: limit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: response.total,
                computers: response.computers,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_computers_reboot": {
      const computerId = args.computer_id as number;
      const force = args.force as boolean | undefined;
      const result = await client.computers.reboot(computerId, { force });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Reboot command sent to computer ${computerId}`,
                result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_computers_run_script": {
      const computerId = args.computer_id as number;
      const scriptId = args.script_id as number;
      const parameters = args.parameters as Record<string, string> | undefined;
      const result = await client.computers.runScript(computerId, scriptId, {
        parameters,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Script ${scriptId} queued for execution on computer ${computerId}`,
                result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [
          { type: "text", text: `Unknown computer tool: ${toolName}` },
        ],
        isError: true,
      };
  }
}

export const computersHandler: DomainHandler = {
  getTools,
  handleCall,
};
