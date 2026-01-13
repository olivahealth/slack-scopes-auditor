// Slack Scopes Auditor - Web UI
// This is a simple vanilla JS implementation that calls the Slack API directly

const SLACK_APP_MANIFEST = {
  _metadata: { major_version: 1, minor_version: 1 },
  display_information: {
    name: 'Scopes Auditor',
    description: 'Audit Slack app scopes and integration logs',
    background_color: '#1a1a2e',
    long_description:
      'An open-source tool for auditing Slack app scopes using the team.integrationLogs API. This app helps IT admins and organization admins verify what scopes have been granted to Slack apps in their workspace. It requires admin privileges to access integration logs and is only available on paid Slack plans.',
  },
  oauth_config: {
    scopes: { user: ['admin'] },
  },
  settings: {
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

// Scope categories for grouping
const SCOPE_PATTERNS = {
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

// Store logs globally for tab switching
let currentLogs = [];
let currentAppId = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('manifestCode').textContent = JSON.stringify(
    SLACK_APP_MANIFEST,
    null,
    2
  );

  // Set up tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

function switchTab(tabName) {
  // Update button states
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update content visibility
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

function showManifestInfo() {
  document.getElementById('manifestInfo').classList.remove('hidden');
}

function hideManifestInfo() {
  document.getElementById('manifestInfo').classList.add('hidden');
}

function copyManifest() {
  navigator.clipboard
    .writeText(JSON.stringify(SLACK_APP_MANIFEST, null, 2))
    .then(() => alert('Manifest copied to clipboard!'))
    .catch(() => alert('Failed to copy. Please copy manually.'));
}

async function runAudit() {
  const token = document.getElementById('token').value.trim();
  const appId = document.getElementById('appId').value.trim();
  const resultsSection = document.getElementById('results');
  const errorSection = document.getElementById('error');
  const scopesContainer = document.getElementById('scopesContainer');

  // Validate inputs
  if (!token) {
    showError('Please enter your Slack token');
    return;
  }
  if (!appId) {
    showError('Please enter an App ID to audit');
    return;
  }

  // Hide previous results/errors
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');

  // Show loading
  scopesContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Fetching integration logs...</p>
    </div>
  `;
  resultsSection.classList.remove('hidden');

  try {
    // Fetch all logs for the app
    const logs = await fetchAllLogs(token, appId);

    // Store for tab switching
    currentLogs = logs;
    currentAppId = appId;

    // Compute current scopes
    const result = computeCurrentScopes(logs, appId);

    // Categorize scopes
    const categorized = categorizeScopes(result.activeScopes);

    // Display all views
    displayResults(result, categorized);
    displayTimeline(logs);
    displayUserPermissions(logs);

    // Switch to scopes tab
    switchTab('scopes');
  } catch (error) {
    resultsSection.classList.add('hidden');
    showError(error.message);
  }
}

async function fetchAllLogs(token, appId) {
  const allLogs = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      token,
      app_id: appId,
      count: '100',
      page: page.toString(),
    });

    const response = await fetch('https://slack.com/api/team.integrationLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(getErrorMessage(data.error));
    }

    allLogs.push(...data.logs);
    totalPages = data.paging.pages;
    page++;
  } while (page <= totalPages);

  return allLogs;
}

function computeCurrentScopes(logs, appId) {
  // Sort logs by date ascending
  const sortedLogs = logs
    .filter((log) => log.app_id === appId || log.service_id === appId)
    .sort((a, b) => parseInt(a.date) - parseInt(b.date));

  const activeScopes = new Set();
  let totalGrants = 0;
  let totalRevokes = 0;
  let lastActivity = null;

  for (const log of sortedLogs) {
    const scopes = parseScopes(log.scope);
    const logDate = new Date(parseInt(log.date) * 1000);

    if (!lastActivity || logDate > lastActivity) {
      lastActivity = logDate;
    }

    switch (log.change_type) {
      case 'added':
      case 'expanded':
        scopes.forEach((s) => activeScopes.add(s));
        totalGrants += scopes.length;
        break;
      case 'removed':
        scopes.forEach((s) => activeScopes.delete(s));
        totalRevokes += scopes.length;
        break;
      case 'updated':
        scopes.forEach((s) => activeScopes.add(s));
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

function parseScopes(scopeString) {
  if (!scopeString) return [];
  return scopeString
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function categorizeScopes(scopes) {
  const categoryMap = new Map();

  // Initialize categories
  for (const category of Object.keys(SCOPE_PATTERNS)) {
    categoryMap.set(category, new Set());
  }
  categoryMap.set('Other', new Set());

  // Categorize each scope
  for (const scope of scopes) {
    let matched = false;
    for (const [category, pattern] of Object.entries(SCOPE_PATTERNS)) {
      if (pattern.test(scope)) {
        categoryMap.get(category).add(scope);
        matched = true;
        break;
      }
    }
    if (!matched) {
      categoryMap.get('Other').add(scope);
    }
  }

  // Build result with non-empty categories
  const categories = [];
  for (const [name, scopeSet] of categoryMap) {
    if (scopeSet.size > 0) {
      categories.push({
        name,
        scopes: Array.from(scopeSet).sort(),
      });
    }
  }

  // Sort categories, keep "Other" at end
  categories.sort((a, b) => {
    if (a.name === 'Other') return 1;
    if (b.name === 'Other') return -1;
    return a.name.localeCompare(b.name);
  });

  return { categories, total: scopes.length };
}

function displayResults(result, categorized) {
  const container = document.getElementById('scopesContainer');

  if (categorized.categories.length === 0) {
    container.innerHTML = '<p>No active scopes found for this app.</p>';
    return;
  }

  let html = '';

  for (const category of categorized.categories) {
    html += `
      <div class="scope-category">
        <h4>${category.name} (${category.scopes.length})</h4>
        <ul class="scope-list">
          ${category.scopes.map((s) => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  html += `
    <div class="summary">
      <p><strong>Total:</strong> ${categorized.total} active scopes</p>
      ${result.lastActivity ? `<p><strong>Last activity:</strong> ${result.lastActivity.toLocaleString()}</p>` : ''}
    </div>
  `;

  container.innerHTML = html;
}

function displayTimeline(logs) {
  const container = document.getElementById('timelineContainer');

  if (logs.length === 0) {
    container.innerHTML = '<p>No events found.</p>';
    return;
  }

  // Sort by date descending (most recent first)
  const sortedLogs = [...logs].sort(
    (a, b) => parseInt(b.date) - parseInt(a.date)
  );

  let html = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Scopes</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const log of sortedLogs) {
    const date = new Date(parseInt(log.date) * 1000);
    const scopes = parseScopes(log.scope);

    html += `
      <tr>
        <td>${date.toLocaleString()}</td>
        <td>${escapeHtml(log.user_name)}</td>
        <td>
          <span class="badge badge-${log.change_type}">${log.change_type}</span>
        </td>
        <td class="scopes-cell">
          ${scopes.length > 0 ? scopes.map((s) => `<span class="scope-tag">${escapeHtml(s)}</span>`).join('') : '-'}
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
    <div class="summary">
      <p><strong>Total events:</strong> ${logs.length}</p>
    </div>
  `;

  container.innerHTML = html;
}

function displayUserPermissions(logs) {
  const container = document.getElementById('usersContainer');

  if (logs.length === 0) {
    container.innerHTML = '<p>No user activity found.</p>';
    return;
  }

  // Group by user
  const userMap = new Map();

  for (const log of logs) {
    const scopes = parseScopes(log.scope);
    const timestamp = new Date(parseInt(log.date) * 1000);

    let user = userMap.get(log.user_id);
    if (!user) {
      user = {
        userId: log.user_id,
        userName: log.user_name,
        actions: [],
        totalGranted: 0,
        totalRevoked: 0,
        lastActivity: timestamp,
      };
      userMap.set(log.user_id, user);
    }

    user.actions.push({
      timestamp,
      changeType: log.change_type,
      scopes,
    });

    if (log.change_type === 'added' || log.change_type === 'expanded') {
      user.totalGranted += scopes.length;
    } else if (log.change_type === 'removed') {
      user.totalRevoked += scopes.length;
    }

    if (timestamp > user.lastActivity) {
      user.lastActivity = timestamp;
    }
  }

  // Sort users by last activity
  const users = Array.from(userMap.values()).sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  );

  let html = '';

  for (const user of users) {
    // Sort actions by date descending
    user.actions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    html += `
      <div class="user-card">
        <div class="user-card-header">
          <h4>${escapeHtml(user.userName)}</h4>
          <div class="user-stats">
            <span class="stat-granted">+${user.totalGranted} granted</span>
            <span class="stat-revoked">-${user.totalRevoked} revoked</span>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Action</th>
              <th>Scopes</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const action of user.actions) {
      html += `
        <tr>
          <td>${action.timestamp.toLocaleString()}</td>
          <td>
            <span class="badge badge-${action.changeType}">${action.changeType}</span>
          </td>
          <td class="scopes-cell">
            ${action.scopes.length > 0 ? action.scopes.map((s) => `<span class="scope-tag">${escapeHtml(s)}</span>`).join('') : '-'}
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  html += `
    <div class="summary">
      <p><strong>Total users:</strong> ${users.length}</p>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const errorSection = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
}

function getErrorMessage(errorCode) {
  const messages = {
    invalid_auth: 'Invalid authentication token. Please check your token.',
    not_admin: 'You must be an admin to access this API.',
    paid_only: 'This API is only available on paid Slack plans.',
    not_allowed_token_type:
      'Token type not permitted. Use a user token with admin scope.',
    missing_scope:
      'Token is missing required scope. Ensure you have the "admin" scope.',
    account_inactive: 'Account is inactive or has been deactivated.',
    token_revoked: 'Token has been revoked.',
  };

  return messages[errorCode] || `Slack API error: ${errorCode}`;
}
