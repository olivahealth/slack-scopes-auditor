import { Command } from 'commander';
import ora from 'ora';
import { SlackClient, type ChangeType } from '@slack-scopes-auditor/core';
import { getConfig } from '../utils/config.js';
import { handleError } from '../utils/error-handler.js';
import { formatLogsTable, formatJson } from '../formatters/index.js';

export function createLogsCommand(): Command {
  return new Command('logs')
    .description('Fetch and display raw integration logs')
    .option('-a, --app-id <appId>', 'Filter by app ID')
    .option('-u, --user <userId>', 'Filter by user ID')
    .option(
      '-c, --change-type <type>',
      'Filter by change type (added, removed, enabled, disabled, expanded, updated)'
    )
    .option('-n, --count <count>', 'Number of results per page', '100')
    .option('-p, --page <page>', 'Page number', '1')
    .option('--all', 'Fetch all pages')
    .option('-l, --limit <limit>', 'Maximum number of records to fetch')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const config = await getConfig(globalOpts);

        const spinner = ora('Fetching integration logs...').start();

        const client = new SlackClient({ token: config.token });

        const params = {
          app_id: options.appId,
          user: options.user,
          change_type: options.changeType as ChangeType | undefined,
          team_id: config.teamId,
          count: parseInt(options.count, 10),
          page: parseInt(options.page, 10),
        };

        let logs;
        if (options.all || options.limit) {
          const limit = options.limit ? parseInt(options.limit, 10) : undefined;
          logs = await client.getAllIntegrationLogs({
            ...params,
            limit,
            onProgress: (progress) => {
              spinner.text = `Fetching page ${progress.currentPage}/${progress.totalPages} (${progress.recordsFetched} records)...`;
            },
          });
          const limitNote = limit && logs.length >= limit ? ` (limited to ${limit})` : '';
          spinner.succeed(`Fetched ${logs.length} total log entries${limitNote}`);
        } else {
          const response = await client.getIntegrationLogs(params);
          logs = response.logs;
          spinner.succeed(
            `Fetched ${logs.length} log entries (page ${response.paging.page}/${response.paging.pages})`
          );
        }

        if (globalOpts.output === 'json') {
          console.log(formatJson(logs));
        } else {
          console.log(formatLogsTable(logs));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
