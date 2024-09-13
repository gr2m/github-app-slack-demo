// @ts-check

import { App as OctokitApp, Octokit } from "octokit";
import { cleanEnv, str } from "envalid";
import pino from "pino";

import main from "../../../main.js";

const env = cleanEnv(process.env, {
  // Set by Netlify
  URL: str(),

  // Slack App credentials
  SLACK_CLIENT_ID: str(),
});

const slackLoginLog = pino().child({ function: "slack-login" });

export async function handler(event, context) {
  slackLoginLog.info("Received event");

  const oauthLoginUrl = new URL(`https://slack.com/oauth/v2/authorize`);
  // TODO: get scopes dynamically from API
  oauthLoginUrl.searchParams.set("scope", "chat:write,commands");
  oauthLoginUrl.searchParams.set("user_scope", "");
  // TODO: handle oauth callback
  oauthLoginUrl.searchParams.set("redirect_uri", env.URL);
  oauthLoginUrl.searchParams.set("client_id", env.SLACK_CLIENT_ID);

  return {
    statusCode: 302,
    headers: {
      Location: oauthLoginUrl,
    },
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
      }),
    );
  }

  return JSON.parse(inputStringBody);
}
