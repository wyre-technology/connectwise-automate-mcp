/**
 * Lazy-loaded ConnectWise Automate client
 *
 * This module provides lazy initialization of the ConnectWise Automate client
 * to avoid loading the entire library upfront.
 */

import type { ConnectWiseAutomateClient } from "@asachs01/node-connectwise-automate";

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
 * Get or create the ConnectWise Automate client (lazy initialization)
 */
export async function getClient(): Promise<ConnectWiseAutomateClient> {
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
      "@asachs01/node-connectwise-automate"
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
 * Clear the cached client (useful for testing)
 */
export function clearClient(): void {
  _client = null;
  _credentials = null;
}
