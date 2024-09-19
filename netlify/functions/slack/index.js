// @ts-check

import Bolt from "@slack/bolt";
import { App as OctokitApp, Octokit } from "octokit";
import { cleanEnv, str } from "envalid";
import pino from "pino";
import serverless from "serverless-http";

import main from "../../../main.js";
import { getInstallationStore } from "../../../lib/slack-installation-store.js";

console.log(process.env);

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: str(),
  GITHUB_APP_PRIVATE_KEY: str(),
  GITHUB_OAUTH_CLIENT_ID: str(),
  GITHUB_OAUTH_CLIENT_SECRET: str(),
  GITHUB_WEBHOOK_SECRET: str(),

  // Slack App credentials
  SLACK_APP_ID: str(),
  SLACK_CLIENT_ID: str(),
  SLACK_CLIENT_SECRET: str(),
  SLACK_SIGNING_SECRET: str(),

  // app settings
  SLACK_COMMAND: str({ default: "/hello-github-local" }),

  // netlify environment variables
  DEPLOY_URL: str(),
  SITE_ID: str(),
  NETLIFY_PERSONAL_ACCESS_TOKEN: str(),
});

const slackEventsLog = pino().child({ function: "slack-events" });

const slackLogger = {
  debug: slackEventsLog.debug.bind(slackEventsLog),
  info: slackEventsLog.info.bind(slackEventsLog),
  warn: slackEventsLog.warn.bind(slackEventsLog),
  error: slackEventsLog.error.bind(slackEventsLog),
  getLevel: () => slackEventsLog.level,
  setLevel: (level) => {
    slackEventsLog.level = level;
  },
  setName: (name) => {},
};

const boltInstallationStore = getInstallationStore({
  siteID: env.SITE_ID,
  token: env.NETLIFY_PERSONAL_ACCESS_TOKEN,
});
// NOTE: Ideally we would use the AwsLambdaReceiver, but it does not support Slack OAuth Flow as of 2024-09-14
//       https://github.com/slackapi/bolt-js/blob/87d75c59f5eb9b28586173487dac1a0d6e1deada/src/receivers/AwsLambdaReceiver.ts#L93-L96
//
//       Because of that we need to use the ExpressReceiver and wrap it with `serverless` to make it work with Netlify
const expressReceiver = new Bolt.ExpressReceiver({
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  signingSecret: env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  logger: slackLogger,
  stateSecret: "state-secret",
  // TODO: set scopes dynamically
  scopes: ["chat:write", "chat:write.public", "commands"],
  installerOptions: {
    directInstall: true,
    installPath: "/api/slack/install",
    redirectUriPath: "/api/slack/oauth_redirect",
  },
  redirectUri: `${env.DEPLOY_URL}/api/slack/oauth_redirect`,
  installationStore: boltInstallationStore,
  endpoints: {
    events: "/api/slack/events",
  },
});

const boltApp = new Bolt.App({
  receiver: expressReceiver,
  logger: slackLogger,
});

const octokitApp = new OctokitApp({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  oauth: {
    clientId: env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
  },
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET,
  },
  Octokit: Octokit.defaults({
    userAgent: "gr2m/github-app-slack-demo",
  }),
  log: {
    debug: slackEventsLog.debug.bind(slackEventsLog),
    info: slackEventsLog.info.bind(slackEventsLog),
    warn: slackEventsLog.warn.bind(slackEventsLog),
    error: slackEventsLog.error.bind(slackEventsLog),
  },
});

main({
  boltApp,
  octokitApp,
  boltInstallationStore,
  settings: {
    slackAppId: env.SLACK_APP_ID,
    slackCommand: env.SLACK_COMMAND,
  },
});

export const handler = serverless(expressReceiver.app);
