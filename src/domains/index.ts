/**
 * Domain handlers index
 *
 * Lazy-loads domain handlers to avoid loading everything upfront.
 */

import type { DomainHandler } from "../utils/types.js";
import type { DomainName } from "../utils/types.js";

// Cache for loaded domain handlers
const domainCache = new Map<DomainName, DomainHandler>();

/**
 * Lazy-load a domain handler
 */
export async function getDomainHandler(
  domain: DomainName
): Promise<DomainHandler> {
  // Check cache first
  const cached = domainCache.get(domain);
  if (cached) {
    return cached;
  }

  // Dynamically import the domain handler
  let handler: DomainHandler;

  switch (domain) {
    case "computers": {
      const { computersHandler } = await import("./computers.js");
      handler = computersHandler;
      break;
    }
    case "clients": {
      const { clientsHandler } = await import("./clients.js");
      handler = clientsHandler;
      break;
    }
    case "alerts": {
      const { alertsHandler } = await import("./alerts.js");
      handler = alertsHandler;
      break;
    }
    case "scripts": {
      const { scriptsHandler } = await import("./scripts.js");
      handler = scriptsHandler;
      break;
    }
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }

  // Cache the handler
  domainCache.set(domain, handler);
  return handler;
}

/**
 * Get all available domain names
 */
export function getAvailableDomains(): DomainName[] {
  return ["computers", "clients", "alerts", "scripts"];
}

/**
 * Clear the domain cache (useful for testing)
 */
export function clearDomainCache(): void {
  domainCache.clear();
}
