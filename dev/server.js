// @ts-check

import { readFile, writeFile } from "node:fs/promises";

import { cleanEnv, str, num, makeValidator } from "envalid";
import { App as GithubApp, Octokit } from "octokit";
import Bolt from "@slack/bolt";
import chalk from "chalk";

export const DEV_SERVER_LOG_PREFIX = `${chalk.blueBright("◈")}`;

/**
 * @param {string} url
 * @returns {string}
 */
const isNetlifyLiveUrl = makeValidator((url) => {
  const { hostname } = new URL(url);
  if (hostname.endsWith(".netlify.live")) return url;

  throw new Error(
    `Must be set to a *.netlify.live url. Start with "netlify dev --live"`,
  );
});

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),
  GITHUB_WEBHOOK_SECRET: str(),

  // Slack App credentials
  SLACK_APP_ID: str(),
  SLACK_CLIENT_ID: str(),
  SLACK_CLIENT_SECRET: str(),
  SLACK_SIGNING_SECRET: str(),
  SLACK_CONFIGURATION_REFRESH_TOKEN: str(),

  // netlify environment variables
  NETLIFY_LOCAL: str({ choices: ["true"] }),
  DEPLOY_URL: isNetlifyLiveUrl(),
});

main();

// keep the process running
setTimeout(() => {}, 151_200_000);

async function main() {
  // instantiate the Octokit app
  const githubAppClient = new GithubApp({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    webhooks: {
      // value does not matter, but has to be set.
      secret: "secret",
    },
    Octokit: Octokit.defaults({
      userAgent: "gr2m/github-app-slack-demo",
    }),
  });

  // verify credentials and say hi
  // https://docs.github.com/rest/apps/apps#get-the-authenticated-app
  const { data: appInfo } = await githubAppClient.octokit.request("GET /app");
  console.log(
    `${DEV_SERVER_LOG_PREFIX} Authenticated as GitHub App ${chalk.bold.whiteBright(
      appInfo?.slug,
    )} (${chalk.underline(appInfo?.html_url)}).`,
  );

  // update the webhook url
  // https://docs.github.com/rest/apps/webhooks#update-a-webhook-configuration-for-an-app
  const { data: appHookConfig } = await githubAppClient.octokit.request(
    "GET /app/hook/config",
  );
  const githubWebhookUrl = `${env.DEPLOY_URL}/api/github-webhooks`;
  if (appHookConfig.url === githubWebhookUrl) {
    console.log(
      `${DEV_SERVER_LOG_PREFIX} GitHub App webhook URL is already up-to-date.`,
    );
  } else {
    await githubAppClient.octokit.request("PATCH /app/hook/config", {
      data: {
        url: githubWebhookUrl,
        secret: env.GITHUB_WEBHOOK_SECRET,
      },
    });
    console.log(
      `${DEV_SERVER_LOG_PREFIX} Updated GitHub App webhook URL to ${chalk.underline(
        githubWebhookUrl,
      )}.`,
    );
  }

  // start slack app
  // Initializes your app with your bot token and signing secret
  const slackApp = new Bolt.App({
    clientId: env.SLACK_CLIENT_ID,
    clientSecret: env.SLACK_CLIENT_SECRET,
    signingSecret: env.SLACK_SIGNING_SECRET,
    stateSecret: "state-secret",
    scopes: [],
    deferInitialization: true,
  });

  const envFileContents = await readFile(".env", "utf8");
  const slackUrl = `${env.DEPLOY_URL}/api/slack`;
  const slackOauthRedirectUrl = `${slackUrl}/oauth_redirect`;
  const slackEventsUrl = `${slackUrl}/events`;

  try {
    await slackApp.init();

    const result = await slackApp.client.tooling.tokens.rotate({
      refresh_token: env.SLACK_CONFIGURATION_REFRESH_TOKEN,
    });

    const configurationAccessToken = String(result.token);

    // update value of SLACK_CONFIGURATION_REFRESH_TOKEN in .env file
    const newEnvFileContents = envFileContents.replace(
      /SLACK_CONFIGURATION_REFRESH_TOKEN=.*/,
      `SLACK_CONFIGURATION_REFRESH_TOKEN=${result.refresh_token}`,
    );
    await writeFile(".env", newEnvFileContents);
    console.log(
      `${DEV_SERVER_LOG_PREFIX} Updated ${chalk.bold.whiteBright(
        "SLACK_CONFIGURATION_REFRESH_TOKEN",
      )} in ${chalk.bold.whiteBright(".env")}.`,
    );

    /** @type {any} `manifest` and all its keys can be undefined in theory */
    const { manifest } = await slackApp.client.apps.manifest.export({
      app_id: env.SLACK_APP_ID,
      token: configurationAccessToken,
    });

    // update the Slack Request URL if needed
    if (
      manifest.settings.event_subscriptions.request_url === slackEventsUrl &&
      manifest.features.slash_commands[0].url === slackEventsUrl &&
      manifest.oauth_config.redirect_urls[0] === slackOauthRedirectUrl
    ) {
      console.log(
        `${DEV_SERVER_LOG_PREFIX} URLs are up-to-date for the "${manifest.display_information.name}" Slack app.`,
      );
      return;
    }

    manifest.features.slash_commands[0].url = slackEventsUrl;
    manifest.oauth_config.redirect_urls = [slackOauthRedirectUrl];
    manifest.settings.event_subscriptions.request_url = slackEventsUrl;

    await slackApp.client.apps.manifest.update({
      app_id: env.SLACK_APP_ID,
      manifest,
      token: configurationAccessToken,
    });
    console.log(
      `${DEV_SERVER_LOG_PREFIX} Updated URLs for the "${manifest.display_information.name}" Slack app.`,
    );
  } catch (error) {
    if (error?.data?.error === "invalid_refresh_token") {
      console.log(
        `${DEV_SERVER_LOG_PREFIX} ${chalk.bold.redBright(
          "Invalid refresh token",
        )}. Get a valid token at ${chalk.underline(
          "https://api.slack.com/reference/manifests#config-tokens",
        )}, then update ${chalk.bold.whiteBright(
          "SLACK_CONFIGURATION_REFRESH_TOKEN",
        )} in ${chalk.bold.whiteBright(".env")}.`,
      );

      process.exit();
    }

    if (error?.data?.error === "no_permission") {
      console.log(
        `${DEV_SERVER_LOG_PREFIX} ${chalk.bold.yellowBright(
          "Slack Request URL could not be updated",
        )}. Set it to ${chalk.bold.whiteBright(slackUrl)} at ${chalk.underline(
          `https://api.slack.com/apps/${env.SLACK_APP_ID}/event-subscriptions`,
        )} and ${chalk.underline(
          `https://api.slack.com/apps/${env.SLACK_APP_ID}/slash-commands`,
        )}.`,
      );
      return;
    }

    throw error;
  }
}
