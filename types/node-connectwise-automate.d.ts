/**
 * Type declarations for @wyre-technology/node-connectwise-automate
 *
 * These are stub declarations until the actual library is published.
 */

declare module "@wyre-technology/node-connectwise-automate" {
  export interface ConnectWiseAutomateConfig {
    serverUrl: string;
    clientId: string;
    username: string;
    password: string;
    twoFactorCode?: string;
  }

  export interface Computer {
    id: number;
    computerName: string;
    clientId: number;
    locationId: number;
    status: string;
    [key: string]: unknown;
  }

  export interface Client {
    id: number;
    name: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    email?: string;
    [key: string]: unknown;
  }

  export interface Location {
    id: number;
    name: string;
    clientId: number;
    [key: string]: unknown;
  }

  export interface Alert {
    id: number;
    message: string;
    severity: string;
    status: string;
    computerId?: number;
    clientId?: number;
    [key: string]: unknown;
  }

  export interface Script {
    id: number;
    name: string;
    description?: string;
    folderId?: number;
    content?: string;
    [key: string]: unknown;
  }

  export interface ListResponse<T> {
    total: number;
  }

  export interface ComputerListResponse extends ListResponse<Computer> {
    computers: Computer[];
  }

  export interface ClientListResponse extends ListResponse<Client> {
    clients: Client[];
  }

  export interface LocationListResponse extends ListResponse<Location> {
    locations: Location[];
  }

  export interface AlertListResponse extends ListResponse<Alert> {
    alerts: Alert[];
  }

  export interface ScriptListResponse extends ListResponse<Script> {
    scripts: Script[];
  }

  export interface ComputersAPI {
    list(params?: {
      clientId?: number;
      locationId?: number;
      status?: "online" | "offline" | "all";
      pageSize?: number;
      skip?: number;
    }): Promise<ComputerListResponse>;
    get(computerId: number): Promise<Computer>;
    search(params: {
      query: string;
      clientId?: number;
      pageSize?: number;
    }): Promise<ComputerListResponse>;
    reboot(
      computerId: number,
      options?: { force?: boolean }
    ): Promise<{ success: boolean }>;
    runScript(
      computerId: number,
      scriptId: number,
      options?: { parameters?: Record<string, string> }
    ): Promise<{ jobId: number }>;
  }

  export interface ClientsAPI {
    list(params?: {
      pageSize?: number;
      skip?: number;
    }): Promise<ClientListResponse>;
    get(clientId: number): Promise<Client>;
    create(data: {
      name: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      phone?: string;
      email?: string;
    }): Promise<Client>;
    update(
      clientId: number,
      data: {
        name?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        phone?: string;
        email?: string;
      }
    ): Promise<Client>;
  }

  export interface LocationsAPI {
    list(params?: {
      clientId?: number;
      pageSize?: number;
      skip?: number;
    }): Promise<LocationListResponse>;
    get(locationId: number): Promise<Location>;
  }

  export interface AlertsAPI {
    list(params?: {
      computerId?: number;
      clientId?: number;
      status?: "active" | "acknowledged" | "all";
      severity?: "critical" | "warning" | "informational" | "all";
      pageSize?: number;
      skip?: number;
    }): Promise<AlertListResponse>;
    get(alertId: number): Promise<Alert>;
    acknowledge(
      alertId: number,
      options?: { comment?: string }
    ): Promise<{ success: boolean }>;
  }

  export interface ScriptsAPI {
    list(params?: {
      folderId?: number;
      search?: string;
      pageSize?: number;
      skip?: number;
    }): Promise<ScriptListResponse>;
    get(
      scriptId: number,
      options?: { includeContent?: boolean }
    ): Promise<Script>;
    execute(
      scriptId: number,
      options?: {
        computerIds?: number[];
        parameters?: Record<string, string>;
        priority?: "low" | "normal" | "high";
      }
    ): Promise<{ jobId: number }>;
  }

  export class ConnectWiseAutomateClient {
    constructor(config: ConnectWiseAutomateConfig);
    computers: ComputersAPI;
    clients: ClientsAPI;
    locations: LocationsAPI;
    alerts: AlertsAPI;
    scripts: ScriptsAPI;
  }
}
