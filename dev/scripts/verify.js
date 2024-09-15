// @ts-check

import Bolt from "@slack/bolt";
import { cleanEnv, str, num } from "envalid";
import { App } from "octokit";

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),

  // Slack App credentials
  SLACK_CLIENT_ID: str(),
  SLACK_CLIENT_SECRET: str(),
  SLACK_SIGNING_SECRET: str(),
});

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
console.log(`GitHub: Authenticated as ${appInfo.name} (${appInfo.html_url})`);

// verify that webhooks are enabled
// https://docs.github.com/en/rest/apps/webhooks#list-deliveries-for-an-app-webhook
await githubAppClient.octokit.request("GET /app/hook/deliveries", {
  per_page: 1,
});
console.log("GitHub: Webhooks enabled");

// start slack app
// Initializes your app with your bot token and signing secret
const slackAppClient = new Bolt.App({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ["channels:history", "chat:write", "commands"],
  authorize: async () => ({}),
});

// TODO: is there a way to verify credentials for the slack app?
