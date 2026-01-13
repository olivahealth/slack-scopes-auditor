// API
export {
  SlackClient,
  type SlackClientConfig,
  type PaginationProgress,
  type GetAllLogsOptions,
  type ChangeType,
  type DisabledReason,
  type IntegrationLog,
  type IntegrationLogsRequest,
  type IntegrationLogsResponse,
  type PagingInfo,
} from './api/index.js';

// Transformers
export {
  categorizeScopes,
  parseScopes,
  computeCurrentScopes,
  computeAllAppScopes,
  transformToTimeline,
  filterTimelineByDays,
  filterTimelineByApp,
  transformToUserScopes,
  type CategorizedScopes,
  type ScopeCategory,
  type CurrentScopesResult,
  type TimelineEvent,
  type UserScopeAction,
  type UserScopeSummary,
} from './transformers/index.js';

// Errors
export { SlackApiError, ConfigurationError } from './errors/index.js';
