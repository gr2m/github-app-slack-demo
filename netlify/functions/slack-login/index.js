// @ts-check

import { cleanEnv, str } from "envalid";
import pino from "pino";

const env = cleanEnv(process.env, {
  // Set by Netlify
  URL: str(),

  // Slack App credentials
  SLACK_CLIENT_ID: str(),
});

const slackLoginLog = pino().child({ function: "slack-login" });

export async function handler() {
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
