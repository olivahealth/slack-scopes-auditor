import { Command } from 'commander';
import ora from 'ora';
import {
  SlackClient,
  transformToTimeline,
  filterTimelineByDays,
  filterTimelineByApp,
} from '@slack-scopes-auditor/core';
import { getConfig } from '../utils/config.js';
import { handleError } from '../utils/error-handler.js';
import { formatTimelineTable, formatJson } from '../formatters/index.js';

export function createTimelineCommand(): Command {
  return new Command('timeline')
    .description('Display integration events as a timeline')
    .option('-a, --app-id <appId>', 'Filter by app ID')
    .option('-d, --days <days>', 'Show events from last N days', '30')
    .option('-l, --limit <limit>', 'Maximum number of log entries to fetch')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const config = await getConfig(globalOpts);

        const spinner = ora('Fetching integration logs...').start();

        const client = new SlackClient({ token: config.token });
        const limit = options.limit ? parseInt(options.limit, 10) : undefined;
        const logs = await client.getAllIntegrationLogs({
          app_id: options.appId,
          team_id: config.teamId,
          limit,
          onProgress: (progress) => {
            spinner.text = `Fetching page ${progress.currentPage}/${progress.totalPages} (${progress.recordsFetched} records)...`;
          },
        });

        const limitNote = limit && logs.length >= limit ? ` (limited to ${limit})` : '';
        spinner.succeed(`Fetched ${logs.length} log entries${limitNote}`);

        // Transform to timeline
        let timeline = transformToTimeline(logs);

        // Apply filters
        if (options.days) {
          timeline = filterTimelineByDays(timeline, parseInt(options.days, 10));
        }

        if (options.appId) {
          timeline = filterTimelineByApp(timeline, options.appId);
        }

        if (globalOpts.output === 'json') {
          console.log(formatJson(timeline));
        } else {
          console.log(formatTimelineTable(timeline));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
