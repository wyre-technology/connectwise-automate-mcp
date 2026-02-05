/**
 * Clients domain handler
 *
 * Provides tools for client operations in ConnectWise Automate.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { DomainHandler, CallToolResult } from "../utils/types.js";
import { getClient } from "../utils/client.js";

/**
 * Get client domain tools
 */
function getTools(): Tool[] {
  return [
    {
      name: "cwautomate_clients_list",
      description:
        "List all clients in ConnectWise Automate with optional filtering.",
      inputSchema: {
        type: "object" as const,
        properties: {
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
      name: "cwautomate_clients_get",
      description: "Get details for a specific client by ID",
      inputSchema: {
        type: "object" as const,
        properties: {
          client_id: {
            type: "number",
            description: "The client ID",
          },
          include_locations: {
            type: "boolean",
            description: "Include location details in the response",
          },
        },
        required: ["client_id"],
      },
    },
    {
      name: "cwautomate_clients_create",
      description: "Create a new client in ConnectWise Automate",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string",
            description: "Client name",
          },
          city: {
            type: "string",
            description: "City",
          },
          state: {
            type: "string",
            description: "State/Province",
          },
          zip: {
            type: "string",
            description: "ZIP/Postal code",
          },
          country: {
            type: "string",
            description: "Country",
          },
          phone: {
            type: "string",
            description: "Phone number",
          },
          email: {
            type: "string",
            description: "Email address",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "cwautomate_clients_update",
      description: "Update an existing client in ConnectWise Automate",
      inputSchema: {
        type: "object" as const,
        properties: {
          client_id: {
            type: "number",
            description: "The client ID to update",
          },
          name: {
            type: "string",
            description: "New client name",
          },
          city: {
            type: "string",
            description: "New city",
          },
          state: {
            type: "string",
            description: "New state/province",
          },
          zip: {
            type: "string",
            description: "New ZIP/postal code",
          },
          country: {
            type: "string",
            description: "New country",
          },
          phone: {
            type: "string",
            description: "New phone number",
          },
          email: {
            type: "string",
            description: "New email address",
          },
        },
        required: ["client_id"],
      },
    },
  ];
}

/**
 * Handle a client domain tool call
 */
async function handleCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case "cwautomate_clients_list": {
      const limit = (args.limit as number) || 50;
      const skip = (args.skip as number) || 0;
      const response = await client.clients.list({
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
                clients: response.clients,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_clients_get": {
      const clientId = args.client_id as number;
      const includeLocations = args.include_locations as boolean | undefined;

      const clientData = await client.clients.get(clientId);

      let locations;
      if (includeLocations) {
        const locationsResponse = await client.locations.list({
          clientId,
        });
        locations = locationsResponse.locations;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              includeLocations ? { ...clientData, locations } : clientData,
              null,
              2
            ),
          },
        ],
      };
    }

    case "cwautomate_clients_create": {
      const newClient = await client.clients.create({
        name: args.name as string,
        city: args.city as string | undefined,
        state: args.state as string | undefined,
        zip: args.zip as string | undefined,
        country: args.country as string | undefined,
        phone: args.phone as string | undefined,
        email: args.email as string | undefined,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(newClient, null, 2) }],
      };
    }

    case "cwautomate_clients_update": {
      const clientId = args.client_id as number;
      const updatedClient = await client.clients.update(clientId, {
        name: args.name as string | undefined,
        city: args.city as string | undefined,
        state: args.state as string | undefined,
        zip: args.zip as string | undefined,
        country: args.country as string | undefined,
        phone: args.phone as string | undefined,
        email: args.email as string | undefined,
      });

      return {
        content: [
          { type: "text", text: JSON.stringify(updatedClient, null, 2) },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown client tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const clientsHandler: DomainHandler = {
  getTools,
  handleCall,
};
