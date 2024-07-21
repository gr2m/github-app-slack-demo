// @ts-check

import bolt from "@slack/bolt";
import { cleanEnv, str, num } from "envalid";
import { App } from "octokit";
import { pino } from "pino";

import githubApp from "../../github-app.js";
import slackApp from "../../slack-app.js";

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),

  // Slack App credentials
  SLACK_BOT_TOKEN: str(),
  SLACK_APP_TOKEN: str(),
  SLACK_SIGNING_SECRET: str(),
});
const verifyLog = pino().child({ name: "verification" });

// instantiate the Octokit app
const githubAppClient = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
  webhooks: {
    // value does not matter for local development, but has to be set.
    secret: "secret",
  },
});

// verify credentials and say hi
// https://docs.github.com/rest/apps/apps#get-the-authenticated-app
const { data: appInfo } = await githubAppClient.octokit.request("GET /app");
verifyLog.info({ slug: appInfo.slug, url: appInfo.html_url }, `Authenticated`);

// verify that webhooks are enabled
// https://docs.github.com/en/rest/apps/webhooks#list-deliveries-for-an-app-webhook
await githubAppClient.octokit.request("GET /app/hook/deliveries", {
  per_page: 1,
});
verifyLog.info("Webhooks enabled");

// start slack app
// Initializes your app with your bot token and signing secret
const slackAppClient = new bolt.App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
});

await slackAppClient.client.auth.test();
verifyLog.info("Slack App authenticated");
