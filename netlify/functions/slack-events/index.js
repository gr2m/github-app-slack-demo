// @ts-check

import Bolt from "@slack/bolt";
import { App as OctokitApp, Octokit } from "octokit";
import { cleanEnv, str } from "envalid";
import pino from "pino";

import main from "../../../main.js";

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: str(),
  GITHUB_APP_PRIVATE_KEY: str(),
  GITHUB_OAUTH_CLIENT_ID: str(),
  GITHUB_OAUTH_CLIENT_SECRET: str(),
  GITHUB_WEBHOOK_SECRET: str(),

  // Slack App credentials
  SLACK_BOT_TOKEN: str(),
  SLACK_SIGNING_SECRET: str(),

  // app settings
  SLACK_COMMAND: str({ default: "/hello-github-local" }),
});

const slackEventsLog = pino().child({ function: "slack-events" });

const expressReceiver = new Bolt.ExpressReceiver({
  signingSecret: `${env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true,
});

const boltApp = new Bolt.App({
  signingSecret: `${env.SLACK_SIGNING_SECRET}`,
  token: `${env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver,
  logger: {
    debug: slackEventsLog.debug.bind(slackEventsLog),
    info: slackEventsLog.info.bind(slackEventsLog),
    warn: slackEventsLog.warn.bind(slackEventsLog),
    error: slackEventsLog.error.bind(slackEventsLog),
    getLevel: () => slackEventsLog.level,
    setLevel: (level) => {
      slackEventsLog.level = level;
    },
    setName: (name) => {},
  },
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

main({ boltApp, octokitApp, settings: { slackCommand: env.SLACK_COMMAND } });

export async function handler(event, context) {
  let payload;
  try {
    payload = parseRequestBody(
      slackEventsLog,
      event.body,
      event.headers["content-type"]
    );
  } catch (error) {
    slackEventsLog.error({ err: error }, "Failed to parse request body");
    return undefined;
  }

  slackEventsLog.info({ payload }, "Received event");

  // acknowledge Slack's challenge request
  if (payload?.type === "url_verification") {
    slackEventsLog.info("Responding to challenge request");
    return {
      statusCode: 200,
      body: payload.challenge,
    };
  }

  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  return {
    statusCode: 200,
    body: "",
  };
}

/**
 * @param {string | null} stringBody
 * @param {string | undefined} contentType
 * @returns {Record<string, unknown>}
 */
function parseRequestBody(log, stringBody, contentType) {
  let inputStringBody = stringBody ?? "";

  if (contentType === "application/x-www-form-urlencoded") {
    const keyValuePairs = inputStringBody.split("&");
    return Object.fromEntries(
      keyValuePairs.map((pair) => {
        const [key, value] = pair.split("=");
        return [key, decodeURIComponent(value)];
      })
    );
  }

  return JSON.parse(inputStringBody);
}
