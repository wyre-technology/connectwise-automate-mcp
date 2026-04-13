/**
 * Lazy-loaded ConnectWise Automate client
 *
 * This module provides lazy initialization of the ConnectWise Automate client
 * to avoid loading the entire library upfront.
 */

import type { ConnectWiseAutomateClient } from "@wyre-technology/node-connectwise-automate";

export interface CWAutomateCredentials {
  serverUrl: string;
  clientId: string;
  username: string;
  password: string;
  twoFactorCode?: string;
}

let _client: ConnectWiseAutomateClient | null = null;
let _credentials: CWAutomateCredentials | null = null;

/**
 * Per-request client override for gateway mode.
 * Set before handling a tool call and cleared afterward to ensure
 * request-level isolation without mutating process.env.
 */
let _clientOverride: ConnectWiseAutomateClient | null = null;

/**
 * Get credentials from environment variables
 */
export function getCredentials(): CWAutomateCredentials | null {
  const serverUrl = process.env.CW_AUTOMATE_SERVER_URL;
  const clientId = process.env.CW_AUTOMATE_CLIENT_ID;
  const username = process.env.CW_AUTOMATE_USERNAME;
  const password = process.env.CW_AUTOMATE_PASSWORD;
  const twoFactorCode = process.env.CW_AUTOMATE_2FA_CODE;

  if (!serverUrl || !clientId || !username || !password) {
    return null;
  }

  return { serverUrl, clientId, username, password, twoFactorCode };
}

/**
 * Check if credentials are available (from overrides, params, or env)
 */
export function hasCredentials(overrides?: CWAutomateCredentials | null): boolean {
  return !!(overrides || _clientOverride || getCredentials());
}

/**
 * Get or create the ConnectWise Automate client (lazy initialization)
 *
 * Priority: per-request override > env-based singleton
 */
export async function getClient(): Promise<ConnectWiseAutomateClient> {
  // Per-request override takes priority (gateway mode)
  if (_clientOverride) {
    return _clientOverride;
  }

  const creds = getCredentials();

  if (!creds) {
    throw new Error(
      "No API credentials provided. Please configure CW_AUTOMATE_SERVER_URL, CW_AUTOMATE_CLIENT_ID, CW_AUTOMATE_USERNAME, and CW_AUTOMATE_PASSWORD environment variables."
    );
  }

  // If credentials changed, invalidate the cached client
  if (
    _client &&
    _credentials &&
    (creds.serverUrl !== _credentials.serverUrl ||
      creds.clientId !== _credentials.clientId ||
      creds.username !== _credentials.username ||
      creds.password !== _credentials.password ||
      creds.twoFactorCode !== _credentials.twoFactorCode)
  ) {
    _client = null;
  }

  if (!_client) {
    // Lazy import the library
    const { ConnectWiseAutomateClient } = await import(
      "@wyre-technology/node-connectwise-automate"
    );
    _client = new ConnectWiseAutomateClient({
      serverUrl: creds.serverUrl,
      clientId: creds.clientId,
      username: creds.username,
      password: creds.password,
      twoFactorCode: creds.twoFactorCode,
    });
    _credentials = creds;
  }

  return _client;
}

/**
 * Create a new client directly from credentials (no caching).
 * Used in gateway mode for per-request isolation.
 */
export async function createClientDirect(
  creds: CWAutomateCredentials
): Promise<ConnectWiseAutomateClient> {
  const { ConnectWiseAutomateClient } = await import(
    "@wyre-technology/node-connectwise-automate"
  );
  return new ConnectWiseAutomateClient({
    serverUrl: creds.serverUrl,
    clientId: creds.clientId,
    username: creds.username,
    password: creds.password,
    twoFactorCode: creds.twoFactorCode,
  });
}

/**
 * Set a per-request client override (gateway mode)
 */
export function setClientOverride(
  client: ConnectWiseAutomateClient
): void {
  _clientOverride = client;
}

/**
 * Clear the per-request client override
 */
export function clearClientOverride(): void {
  _clientOverride = null;
}

/**
 * Clear the cached client (useful for testing)
 */
export function clearClient(): void {
  _client = null;
  _credentials = null;
  _clientOverride = null;
}
