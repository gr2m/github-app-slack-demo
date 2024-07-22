// @ts-check

import { App, ExpressReceiver } from "@slack/bolt";
import { cleanEnv, str } from "envalid";
import pino from "pino";

import slackApp from "../../../slack-app.js";

const env = cleanEnv(process.env, {
  SLACK_BOT_TOKEN: str(),
  SLACK_SIGNING_SECRET: str(),
});

const slackLog = pino().child({ name: "octokit" });

const expressReceiver = new ExpressReceiver({
  signingSecret: `${env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true,
});

const app = new App({
  signingSecret: `${env.SLACK_SIGNING_SECRET}`,
  token: `${env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver,
});

slackApp(app, slackLog);

export async function handler(event, context) {
  let payload;
  try {
    payload = parseRequestBody(
      slackLog,
      event.body,
      event.headers["content-type"]
    );
  } catch (error) {
    slackLog.error({ err: error }, "Failed to parse request body");
    return undefined;
  }

  slackLog.info({ payload }, "Received event");

  // acknowledge Slack's challenge request
  if (payload?.type === "url_verification") {
    slackLog.info("Responding to challenge request");
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

  await app.processEvent(slackEvent);

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
