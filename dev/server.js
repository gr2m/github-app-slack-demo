// @ts-check

import bolt from "@slack/bolt";
import { cleanEnv, str, num } from "envalid";
import AppWebhookRelay from "github-app-webhook-relay-polling";
import { App, Octokit } from "octokit";
import { pino } from "pino";

import githubApp from "../github-app.js";
import slackApp from "../slack-app.js";

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),

  // Slack App credentials
  SLACK_BOT_TOKEN: str(),
  SLACK_APP_TOKEN: str(),
  SLACK_SIGNING_SECRET: str(),
});
const log = pino();
const octokitLog = log.child({ name: "octokit" });

// instantiate the Octokit app
const githubAppClient = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
  webhooks: {
    // value does not matter, but has to be set.
    secret: "secret",
  },
  Octokit: Octokit.defaults({
    userAgent: "gr2m/github-app-slack-demo",
  }),
  // TODO: pre-binding should not be necessary, seems like a new bug in Octokit
  log: {
    debug: octokitLog.debug.bind(octokitLog),
    info: octokitLog.info.bind(octokitLog),
    warn: octokitLog.warn.bind(octokitLog),
    error: octokitLog.error.bind(octokitLog),
  },
});

// verify credentials and say hi
// https://docs.github.com/rest/apps/apps#get-the-authenticated-app
const { data: appInfo } = await githubAppClient.octokit.request("GET /app");
log.info({ slug: appInfo.slug, url: appInfo.html_url }, `Authenticated`);

// register GitHub webhook handlers
await githubApp(githubAppClient);

// receive webhooks by pulling
const relay = new AppWebhookRelay({
  app: githubAppClient,
});

relay.on("error", (error) => {
  console.log("error: %s", error);
});

relay.start();

// start slack app
// Initializes your app with your bot token and signing secret
const slackAppClient = new bolt.App({
  token: env.SLACK_BOT_TOKEN,
  appToken: env.SLACK_APP_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

await slackAppClient.start();
log.info("⚡️ Bolt app is running!");

slackApp(slackAppClient, log);
