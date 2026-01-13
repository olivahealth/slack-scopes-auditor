import type { IntegrationLog } from '../api/types.js';
import { parseScopes } from './categorize.js';

/**
 * Represents the current active scopes for an app
 */
export interface CurrentScopesResult {
  /** App ID */
  appId: string;
  /** Currently active scopes (deduplicated) */
  activeScopes: string[];
  /** Total number of scope grant events */
  totalGrants: number;
  /** Total number of scope revoke events */
  totalRevokes: number;
  /** Last activity timestamp */
  lastActivity: Date | null;
}

/**
 * Compute the current active scopes from integration logs.
 * This processes the log history to determine what scopes are currently granted.
 *
 * Logic:
 * - 'added' and 'expanded' events add scopes
 * - 'removed' events remove scopes
 * - 'enabled'/'disabled' events change app status but don't affect scopes
 */
export function computeCurrentScopes(
  logs: IntegrationLog[],
  appId: string
): CurrentScopesResult {
  // Filter logs for the specific app and sort by date ascending
  const appLogs = logs
    .filter((log) => log.app_id === appId || log.service_id === appId)
    .sort((a, b) => parseInt(a.date) - parseInt(b.date));

  const activeScopes = new Set<string>();
  let totalGrants = 0;
  let totalRevokes = 0;
  let lastActivity: Date | null = null;

  for (const log of appLogs) {
    const scopes = parseScopes(log.scope);
    const logDate = new Date(parseInt(log.date) * 1000);

    if (!lastActivity || logDate > lastActivity) {
      lastActivity = logDate;
    }

    switch (log.change_type) {
      case 'added':
      case 'expanded':
        for (const scope of scopes) {
          activeScopes.add(scope);
        }
        totalGrants += scopes.length;
        break;

      case 'removed':
        for (const scope of scopes) {
          activeScopes.delete(scope);
        }
        totalRevokes += scopes.length;
        break;

      case 'updated':
        // Updated events may contain the new full scope list
        // For safety, we add them (they represent current state)
        for (const scope of scopes) {
          activeScopes.add(scope);
        }
        break;

      // 'enabled' and 'disabled' don't change scopes
      case 'enabled':
      case 'disabled':
        break;
    }
  }

  return {
    appId,
    activeScopes: Array.from(activeScopes).sort(),
    totalGrants,
    totalRevokes,
    lastActivity,
  };
}

/**
 * Compute current scopes for all apps in the logs
 */
export function computeAllAppScopes(
  logs: IntegrationLog[]
): Map<string, CurrentScopesResult> {
  // Get unique app IDs
  const appIds = new Set<string>();
  for (const log of logs) {
    const id = log.app_id ?? log.service_id;
    if (id) {
      appIds.add(id);
    }
  }

  // Compute scopes for each app
  const results = new Map<string, CurrentScopesResult>();
  for (const appId of appIds) {
    results.set(appId, computeCurrentScopes(logs, appId));
  }

  return results;
}
