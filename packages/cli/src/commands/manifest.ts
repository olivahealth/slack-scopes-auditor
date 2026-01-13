import { Command } from 'commander';
import chalk from 'chalk';

const SLACK_APP_MANIFEST = {
  _metadata: {
    major_version: 1,
    minor_version: 1,
  },
  display_information: {
    name: 'Scopes Auditor',
    description: 'Audit Slack app scopes and integration logs',
    background_color: '#1a1a2e',
    long_description:
      'An open-source tool for auditing Slack app scopes using the team.integrationLogs API. This app helps IT admins and organization admins verify what scopes have been granted to Slack apps in their workspace. It requires admin privileges to access integration logs and is only available on paid Slack plans.',
  },
  oauth_config: {
    scopes: {
      user: ['admin'],
    },
  },
  settings: {
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

export function createManifestCommand(): Command {
  return new Command('manifest')
    .description('Output the Slack app manifest for creating your auditor app')
    .option('--json', 'Output manifest as JSON only')
    .action((options) => {
      if (options.json) {
        console.log(JSON.stringify(SLACK_APP_MANIFEST, null, 2));
        return;
      }

      console.log(chalk.bold.cyan('\n=== Slack Scopes Auditor Setup ===\n'));

      console.log(chalk.yellow('Prerequisites:'));
      console.log('  • A paid Slack workspace (team.integrationLogs requires paid plan)');
      console.log('  • Workspace admin privileges');
      console.log('');

      console.log(chalk.yellow('Step 1: Create a Slack App'));
      console.log('  1. Go to https://api.slack.com/apps');
      console.log('  2. Click "Create New App"');
      console.log('  3. Select "From an app manifest"');
      console.log('  4. Choose your workspace');
      console.log('  5. Paste the manifest below (YAML or JSON tab)');
      console.log('  6. Click "Create"');
      console.log('');

      console.log(chalk.yellow('Step 2: Install the App'));
      console.log('  1. Go to "Install App" in the left sidebar');
      console.log('  2. Click "Install to Workspace"');
      console.log('  3. Review and allow the permissions');
      console.log('');

      console.log(chalk.yellow('Step 3: Get Your Token'));
      console.log('  1. After installation, copy the "User OAuth Token"');
      console.log('     (starts with xoxp-)');
      console.log('  2. Use it with scope-auditor:');
      console.log(
        chalk.gray('     SLACK_TOKEN=xoxp-... scope-auditor audit --app-id A123')
      );
      console.log('');

      console.log(chalk.bold.green('=== App Manifest (JSON) ===\n'));
      console.log(JSON.stringify(SLACK_APP_MANIFEST, null, 2));
      console.log('');

      console.log(chalk.gray('Note: The "admin" scope is required to access team.integrationLogs.'));
      console.log(chalk.gray('This scope allows reading workspace integration activity.'));
    });
}
