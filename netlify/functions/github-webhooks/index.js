import Bolt from "@slack/bolt";
import { cleanEnv, str } from "envalid";
import { App as OctokitApp, Octokit } from "octokit";
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

// export as object for testing
export const state = {
  octokitApp: undefined,
  boltApp: undefined,
  setupAppError: undefined,
  githubWebhooksLog: pino().child({ function: "github-webhooks" }),
  OctokitApp,
  Octokit,
  main,
  RESPONSE_TIMEOUT: 9000,
};

/**
 * Set up the GitHub App. If the app is already set up, return it.
 * @returns {Promise<OctokitApp>}
 * @throws {Error}
 * */
export async function setupApp() {
  if (state.setupAppError) throw state.setupAppError;
  if (state.octokitApp) return state.octokitApp;

  try {
    state.githubWebhooksLog.info("Set up Octokit app");
    const octokitApp = new state.OctokitApp({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
      oauth: {
        clientId: env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
      },
      webhooks: {
        secret: env.GITHUB_WEBHOOK_SECRET,
      },
      Octokit: state.Octokit.defaults({
        userAgent: "gr2m/github-app-slack-demo",
      }),
      log: {
        debug: state.githubWebhooksLog.debug.bind(state.githubWebhooksLog),
        info: state.githubWebhooksLog.info.bind(state.githubWebhooksLog),
        warn: state.githubWebhooksLog.warn.bind(state.githubWebhooksLog),
        error: state.githubWebhooksLog.error.bind(state.githubWebhooksLog),
      },
    });

    state.githubWebhooksLog.info("Set up Bolt app");
    const boltApp = new Bolt.App({
      signingSecret: `${env.SLACK_SIGNING_SECRET}`,
      token: `${env.SLACK_BOT_TOKEN}`,
      logger: {
        debug: state.githubWebhooksLog.debug.bind(state.githubWebhooksLog),
        info: state.githubWebhooksLog.info.bind(state.githubWebhooksLog),
        warn: state.githubWebhooksLog.warn.bind(state.githubWebhooksLog),
        error: state.githubWebhooksLog.error.bind(state.githubWebhooksLog),
        getLevel: () => state.githubWebhooksLog.level,
        /* c8 ignore next 4 */
        setLevel: (level) => {
          state.githubWebhooksLog.level = level;
        },
        setName: (name) => {},
      },
    });

    octokitApp.log.info("Register Octokit and Bolt handlers");
    await state.main({
      octokitApp,
      boltApp,
      settings: { slackCommand: env.SLACK_COMMAND },
    });

    state.octokitApp = octokitApp;
  } catch (error) {
    state.githubWebhooksLog.error(
      error,
      "Failed to set up Octokit and Slack clients"
    );
    state.setupAppError = error;
    throw error;
  }
}

/**
 * Netlify function to handle webhook event requests from GitHub
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    state.githubWebhooksLog.info(
      {
        method: event.httpMethod,
      },
      "Method not allowed"
    );

    return {
      /* The `405` status code in HTTP indicates that the method used in the request is not
      allowed for the specified resource. In the provided code snippet, when the
      `handler` function is called with an HTTP method other than `POST`, it returns a
      response with a status code of `405` along with an error message indicating that
      the method is not allowed for that endpoint. */
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const eventName = event.headers["x-github-event"];
  const eventId = event.headers["x-github-delivery"];
  const eventSignature = event.headers["x-hub-signature-256"];

  state.githubWebhooksLog.info(
    {
      "event.name": eventName,
      "event.id": eventId,
      "event.signature": eventSignature,
    },
    "Webhook received"
  );

  let timeout;
  try {
    let didTimeout = false;
    timeout = setTimeout(() => {
      didTimeout = true;
    }, state.RESPONSE_TIMEOUT).unref();

    await setupApp();
    await state.octokitApp.webhooks.verifyAndReceive({
      id: eventId,
      name: eventName,
      signature: eventSignature,
      payload: event.body,
    });
    clearTimeout(timeout);

    if (didTimeout)
      return {
        statusCode: 202,
        body: JSON.stringify({ ok: true }),
      };

    return {
      statusCode: 200,
    };
  } catch (error) {
    // app.webhooks.verifyAndReceive throws an AggregateError
    if (!Array.isArray(error.errors)) {
      state.githubWebhooksLog.error({ err: error }, "Handler error");

      return {
        statusCode: 500,
        body: "Error: An unexpected error occurred",
      };
    }

    state.githubWebhooksLog.error({ err: error }, "Handler error");
    clearTimeout(timeout);

    const err = Array.from(error.errors)[0];
    const errorMessage = err.message
      ? `${err.name}: ${err.message}`
      : "Error: An unexpected error occurred";
    const statusCode = typeof err.status !== "undefined" ? err.status : 500;

    return {
      statusCode,
      body: errorMessage,
    };
  }
}
