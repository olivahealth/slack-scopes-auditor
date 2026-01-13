/**
 * Scope categories for organized display
 */
export interface ScopeCategory {
  name: string;
  scopes: string[];
}

export interface CategorizedScopes {
  categories: ScopeCategory[];
  total: number;
}

const SCOPE_PATTERNS: Record<string, RegExp> = {
  Channels: /^(channels|groups):/,
  Chat: /^chat:/,
  Users: /^users:/,
  Files: /^files:/,
  Reactions: /^reactions:/,
  Pins: /^pins:/,
  Bookmarks: /^bookmarks:/,
  Reminders: /^reminders:/,
  Search: /^search:/,
  Team: /^team:/,
  Usergroups: /^usergroups:/,
  Workflow: /^workflow\./,
  Admin: /^admin\./,
  Conversations: /^conversations:/,
  'Direct Messages': /^(im|mpim):/,
  Commands: /^commands/,
  Links: /^links:/,
  Emoji: /^emoji:/,
  Calls: /^calls:/,
  Metadata: /^metadata\./,
};

/**
 * Parse a comma-separated scope string into individual scopes
 */
export function parseScopes(scopeString: string | undefined): string[] {
  if (!scopeString) return [];
  return scopeString
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Categorize scopes by their prefix/type
 */
export function categorizeScopes(scopes: string[]): CategorizedScopes {
  const categoryMap = new Map<string, Set<string>>();

  // Initialize all categories
  for (const category of Object.keys(SCOPE_PATTERNS)) {
    categoryMap.set(category, new Set());
  }
  categoryMap.set('Other', new Set());

  // Categorize each scope
  for (const scope of scopes) {
    let matched = false;
    for (const [category, pattern] of Object.entries(SCOPE_PATTERNS)) {
      if (pattern.test(scope)) {
        categoryMap.get(category)!.add(scope);
        matched = true;
        break;
      }
    }
    if (!matched) {
      categoryMap.get('Other')!.add(scope);
    }
  }

  // Build result with non-empty categories
  const categories: ScopeCategory[] = [];
  for (const [name, scopeSet] of categoryMap) {
    if (scopeSet.size > 0) {
      categories.push({
        name,
        scopes: Array.from(scopeSet).sort(),
      });
    }
  }

  // Sort categories by name, but keep "Other" at the end
  categories.sort((a, b) => {
    if (a.name === 'Other') return 1;
    if (b.name === 'Other') return -1;
    return a.name.localeCompare(b.name);
  });

  return {
    categories,
    total: scopes.length,
  };
}
