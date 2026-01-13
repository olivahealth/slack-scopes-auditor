import Table from 'cli-table3';
import chalk from 'chalk';
import type {
  IntegrationLog,
  CategorizedScopes,
  TimelineEvent,
  CurrentScopesResult,
} from '@slack-scopes-auditor/core';

/**
 * Format integration logs as a table
 */
export function formatLogsTable(logs: IntegrationLog[]): string {
  if (logs.length === 0) {
    return chalk.yellow('No logs found.');
  }

  const table = new Table({
    head: [
      chalk.cyan('Date'),
      chalk.cyan('User'),
      chalk.cyan('App ID'),
      chalk.cyan('Action'),
      chalk.cyan('Scopes'),
    ],
    colWidths: [22, 20, 15, 12, 50],
    wordWrap: true,
  });

  for (const log of logs) {
    const date = new Date(parseInt(log.date) * 1000).toISOString();
    const actionColor = getActionColor(log.change_type);

    table.push([
      date.substring(0, 19).replace('T', ' '),
      log.user_name,
      log.app_id ?? log.service_id ?? '-',
      actionColor(log.change_type),
      log.scope ?? '-',
    ]);
  }

  return table.toString();
}

/**
 * Format current scopes with categories as a table
 */
export function formatCurrentScopesTable(
  result: CurrentScopesResult,
  categorized: CategorizedScopes
): string {
  const lines: string[] = [];

  // Header
  lines.push(
    chalk.bold.cyan(`\nCurrent Scopes for App: ${result.appId}`)
  );
  lines.push(chalk.gray('─'.repeat(60)));

  if (categorized.categories.length === 0) {
    lines.push(chalk.yellow('No active scopes found.'));
    return lines.join('\n');
  }

  // Categories
  for (const category of categorized.categories) {
    lines.push('');
    lines.push(
      chalk.bold.white(`${category.name} (${category.scopes.length})`)
    );
    for (const scope of category.scopes) {
      lines.push(chalk.green(`  • ${scope}`));
    }
  }

  // Summary
  lines.push('');
  lines.push(chalk.gray('─'.repeat(60)));
  lines.push(
    chalk.white(`Total: ${chalk.bold(categorized.total)} active scopes`)
  );

  if (result.lastActivity) {
    lines.push(
      chalk.gray(`Last activity: ${result.lastActivity.toISOString()}`)
    );
  }

  return lines.join('\n');
}

/**
 * Format timeline events
 */
export function formatTimelineTable(events: TimelineEvent[]): string {
  if (events.length === 0) {
    return chalk.yellow('No events found.');
  }

  const lines: string[] = [];
  let currentDate = '';

  for (const event of events) {
    const dateStr = event.timestamp.toLocaleDateString();

    if (dateStr !== currentDate) {
      currentDate = dateStr;
      lines.push('');
      lines.push(chalk.bold.underline(dateStr));
    }

    const time = event.timestamp.toLocaleTimeString();
    const icon = getEventIcon(event.changeType);
    const color = getActionColor(event.changeType);

    lines.push(
      `  ${chalk.gray(time)} ${icon} ${color(event.changeType.padEnd(10))} ` +
        `${chalk.cyan(event.userName)} - ${event.appId}`
    );

    if (event.scopes.length > 0) {
      lines.push(`              ${chalk.gray('Scopes:')} ${event.scopes.join(', ')}`);
    }
  }

  return lines.join('\n');
}

function getActionColor(action: string): (text: string) => string {
  switch (action) {
    case 'added':
    case 'enabled':
    case 'expanded':
      return chalk.green;
    case 'removed':
    case 'disabled':
      return chalk.red;
    case 'updated':
      return chalk.yellow;
    default:
      return chalk.white;
  }
}

function getEventIcon(changeType: string): string {
  switch (changeType) {
    case 'added':
      return chalk.green('+');
    case 'removed':
      return chalk.red('-');
    case 'enabled':
      return chalk.green('✓');
    case 'disabled':
      return chalk.red('✗');
    case 'expanded':
      return chalk.blue('^');
    case 'updated':
      return chalk.yellow('~');
    default:
      return ' ';
  }
}
