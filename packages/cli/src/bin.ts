#!/usr/bin/env node

import { Command } from 'commander';
import {
  createAuditCommand,
  createLogsCommand,
  createTimelineCommand,
  createManifestCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('scope-auditor')
  .description(
    'Audit Slack app scopes using the team.integrationLogs API.\n\n' +
      'This tool helps IT admins and organization admins verify what scopes\n' +
      'Slack apps have been granted in their workspace.'
  )
  .version('0.0.1')
  .option('-t, --token <token>', 'Slack admin token (or use SLACK_TOKEN env var)')
  .option('-o, --output <format>', 'Output format: table, json', 'table')
  .option('--team-id <teamId>', 'Team ID (for org-level tokens)');

// Add commands
program.addCommand(createAuditCommand());
program.addCommand(createLogsCommand());
program.addCommand(createTimelineCommand());
program.addCommand(createManifestCommand());

// Default command info when no command is specified
program.action(() => {
  program.help();
});

program.parse();
