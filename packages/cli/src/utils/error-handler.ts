import chalk from 'chalk';
import {
  SlackApiError,
  ConfigurationError,
} from '@slack-scopes-auditor/core';

export function handleError(error: unknown): never {
  if (error instanceof ConfigurationError) {
    console.error(chalk.red('Configuration Error:'), error.message);
    process.exit(1);
  }

  if (error instanceof SlackApiError) {
    console.error(chalk.red('Slack API Error:'), error.message);
    console.error(chalk.gray(`Error code: ${error.code}`));

    if (error.code === 'paid_only') {
      console.error(
        chalk.yellow(
          '\nNote: team.integrationLogs requires a paid Slack plan.'
        )
      );
    }

    if (error.code === 'not_admin') {
      console.error(
        chalk.yellow(
          '\nNote: You must be an admin to access integration logs.'
        )
      );
    }

    if (error.code === 'invalid_auth' || error.code === 'not_allowed_token_type') {
      console.error(
        chalk.yellow(
          '\nRun "scope-auditor manifest" to see how to create a Slack app with the correct scopes.'
        )
      );
    }

    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(chalk.red('Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  console.error(chalk.red('Unexpected Error:'), error);
  process.exit(1);
}
