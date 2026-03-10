/**
 * Alerts domain handler
 *
 * Provides tools for alert operations in ConnectWise Automate.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { DomainHandler, CallToolResult } from "../utils/types.js";
import { getClient } from "../utils/client.js";
import { elicitSelection } from "../utils/elicitation.js";

/**
 * Get alert domain tools
 */
function getTools(): Tool[] {
  return [
    {
      name: "cwautomate_alerts_list",
      description:
        "List alerts in ConnectWise Automate with optional filtering.",
      inputSchema: {
        type: "object" as const,
        properties: {
          computer_id: {
            type: "number",
            description: "Filter alerts by computer ID",
          },
          client_id: {
            type: "number",
            description: "Filter alerts by client ID",
          },
          status: {
            type: "string",
            enum: ["active", "acknowledged", "all"],
            description: "Filter by alert status (default: active)",
          },
          severity: {
            type: "string",
            enum: ["critical", "warning", "informational", "all"],
            description: "Filter by alert severity",
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
      name: "cwautomate_alerts_get",
      description: "Get details for a specific alert by ID",
      inputSchema: {
        type: "object" as const,
        properties: {
          alert_id: {
            type: "number",
            description: "The alert ID",
          },
        },
        required: ["alert_id"],
      },
    },
    {
      name: "cwautomate_alerts_acknowledge",
      description: "Acknowledge an alert to mark it as reviewed",
      inputSchema: {
        type: "object" as const,
        properties: {
          alert_id: {
            type: "number",
            description: "The alert ID to acknowledge",
          },
          comment: {
            type: "string",
            description: "Optional comment to add when acknowledging",
          },
        },
        required: ["alert_id"],
      },
    },
  ];
}

/**
 * Handle an alert domain tool call
 */
async function handleCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case "cwautomate_alerts_list": {
      const limit = (args.limit as number) || 50;
      const skip = (args.skip as number) || 0;
      let severity = args.severity as
        | "critical"
        | "warning"
        | "informational"
        | "all"
        | undefined;
      const computerId = args.computer_id as number | undefined;
      const clientId = args.client_id as number | undefined;
      const status = args.status as "active" | "acknowledged" | "all" | undefined;

      // If no filters provided, ask the user if they want to filter by severity
      if (!computerId && !clientId && !status && !severity) {
        const selected = await elicitSelection(
          "Listing all alerts can return many results. Would you like to filter by severity?",
          "severity",
          [
            { value: "all", label: "All severities" },
            { value: "critical", label: "Critical only" },
            { value: "warning", label: "Warning only" },
            { value: "informational", label: "Informational only" },
          ]
        );
        if (selected && selected !== "all") {
          severity = selected as "critical" | "warning" | "informational";
        }
      }

      const response = await client.alerts.list({
        computerId,
        clientId,
        status,
        severity,
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
                alerts: response.alerts,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_alerts_get": {
      const alertId = args.alert_id as number;
      const alert = await client.alerts.get(alertId);

      return {
        content: [{ type: "text", text: JSON.stringify(alert, null, 2) }],
      };
    }

    case "cwautomate_alerts_acknowledge": {
      const alertId = args.alert_id as number;
      const comment = args.comment as string | undefined;
      const result = await client.alerts.acknowledge(alertId, { comment });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Alert ${alertId} acknowledged`,
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
        content: [{ type: "text", text: `Unknown alert tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const alertsHandler: DomainHandler = {
  getTools,
  handleCall,
};
