/**
 * Scripts domain handler
 *
 * Provides tools for script operations in ConnectWise Automate.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { DomainHandler, CallToolResult } from "../utils/types.js";
import { getClient } from "../utils/client.js";

/**
 * Get script domain tools
 */
function getTools(): Tool[] {
  return [
    {
      name: "cwautomate_scripts_list",
      description:
        "List available scripts in ConnectWise Automate with optional filtering.",
      inputSchema: {
        type: "object" as const,
        properties: {
          folder_id: {
            type: "number",
            description: "Filter scripts by folder ID",
          },
          search: {
            type: "string",
            description: "Search scripts by name",
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
      name: "cwautomate_scripts_get",
      description: "Get details for a specific script by ID",
      inputSchema: {
        type: "object" as const,
        properties: {
          script_id: {
            type: "number",
            description: "The script ID",
          },
          include_content: {
            type: "boolean",
            description: "Include the script content/code in the response",
          },
        },
        required: ["script_id"],
      },
    },
    {
      name: "cwautomate_scripts_execute",
      description:
        "Execute a script on one or more computers. Use the computers domain to find specific computer IDs first.",
      inputSchema: {
        type: "object" as const,
        properties: {
          script_id: {
            type: "number",
            description: "The script ID to execute",
          },
          computer_ids: {
            type: "array",
            items: { type: "number" },
            description:
              "Array of computer IDs to run the script on. If not specified, script runs based on its configured targets.",
          },
          parameters: {
            type: "object",
            description: "Script parameters as key-value pairs",
            additionalProperties: { type: "string" },
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high"],
            description: "Execution priority (default: normal)",
          },
        },
        required: ["script_id"],
      },
    },
  ];
}

/**
 * Handle a script domain tool call
 */
async function handleCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case "cwautomate_scripts_list": {
      const limit = (args.limit as number) || 50;
      const skip = (args.skip as number) || 0;
      const response = await client.scripts.list({
        folderId: args.folder_id as number | undefined,
        search: args.search as string | undefined,
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
                scripts: response.scripts,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_scripts_get": {
      const scriptId = args.script_id as number;
      const includeContent = args.include_content as boolean | undefined;

      const script = await client.scripts.get(scriptId, { includeContent });

      return {
        content: [{ type: "text", text: JSON.stringify(script, null, 2) }],
      };
    }

    case "cwautomate_scripts_execute": {
      const scriptId = args.script_id as number;
      const computerIds = args.computer_ids as number[] | undefined;
      const parameters = args.parameters as Record<string, string> | undefined;
      const priority = args.priority as "low" | "normal" | "high" | undefined;

      const result = await client.scripts.execute(scriptId, {
        computerIds,
        parameters,
        priority,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: computerIds
                  ? `Script ${scriptId} queued for execution on ${computerIds.length} computer(s)`
                  : `Script ${scriptId} queued for execution`,
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
        content: [{ type: "text", text: `Unknown script tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const scriptsHandler: DomainHandler = {
  getTools,
  handleCall,
};
