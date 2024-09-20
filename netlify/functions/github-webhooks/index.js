// @ts-check

import Bolt from "@slack/bolt";
import { cleanEnv, str } from "envalid";
import { App as OctokitApp, Octokit } from "octokit";
import pino from "pino";

import main from "../../../main.js";
import { getInstallationStore } from "../../../lib/slack-installation-store.js";
import { getSubscriptionsStore } from "../../../lib/subscriptions-store.js";

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
  SITE_ID: str(),
  NETLIFY_PERSONAL_ACCESS_TOKEN: str(),
});

// export as object for testing
export const state = {
  octokitApp: undefined,
  boltApp: undefined,
  setupAppError: undefined,
  githubWebhooksLog: pino().child({ function: "github-webhooks" }),
  OctokitApp,
  Octokit,
  Bolt,
  main,
  RESPONSE_TIMEOUT: 9000,
};

/**
 * Set up the GitHub App. If the app is already set up, return it.
 * @returns {Promise<void>}
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

    octokitApp.webhooks.receive;

    state.githubWebhooksLog.info("Set up Bolt app");

    const boltInstallationStore = getInstallationStore({
      siteID: env.SITE_ID,
      token: env.NETLIFY_PERSONAL_ACCESS_TOKEN,
    });

    const boltApp = new state.Bolt.App({
      signingSecret: `${env.SLACK_SIGNING_SECRET}`,
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      logger: {
        debug: state.githubWebhooksLog.debug.bind(state.githubWebhooksLog),
        info: state.githubWebhooksLog.info.bind(state.githubWebhooksLog),
        warn: state.githubWebhooksLog.warn.bind(state.githubWebhooksLog),
        error: state.githubWebhooksLog.error.bind(state.githubWebhooksLog),
        /* c8 ignore next 5 */
        getLevel: () => state.githubWebhooksLog.level,
        setLevel: (level) => {
          state.githubWebhooksLog.level = level;
        },
        setName: (name) => {},
      },
      installationStore: boltInstallationStore,
      /* c8 ignore next */
      authorize: async (...args) => ({}),
    });

    const subscriptionsStore = getSubscriptionsStore({
      siteID: env.SITE_ID,
      token: env.NETLIFY_PERSONAL_ACCESS_TOKEN,
    });

    state.githubWebhooksLog.info("Register Octokit and Bolt handlers");
    await state.main({
      octokitApp,
      boltApp,
      boltInstallationStore,
      subscriptionsStore,
      settings: {
        slackCommand: env.SLACK_COMMAND,
        slackAppId: env.SLACK_APP_ID,
      },
    });

    state.octokitApp = octokitApp;
  } catch (error) {
    state.githubWebhooksLog.error(
      error,
      "Failed to set up Octokit and Slack clients",
    );
    state.setupAppError = error;
    throw error;
  }
}

/**
 * Netlify function to handle webhook event requests from GitHub
 *
 * @param {import("@netlify/functions").HandlerEvent} request
 */
export async function handler(request) {
  if (request.httpMethod !== "POST") {
    state.githubWebhooksLog.info(
      {
        method: request.httpMethod,
      },
      "Method not allowed",
    );

    /* The `405` status code in HTTP indicates that the method used in the request is not
      allowed for the specified resource. In the provided code snippet, when the
      `handler` function is called with an HTTP method other than `POST`, it returns a
      response with a status code of `405` along with an error message indicating that
      the method is not allowed for that endpoint. */

    return errorJsonResponse("Method not allowed", 405);
  }

  const eventName = request.headers["x-github-event"];
  const eventId = request.headers["x-github-delivery"];
  const eventSignature = request.headers["x-hub-signature-256"];

  state.githubWebhooksLog.info(
    {
      "event.name": eventName,
      "event.id": eventId,
      "event.signature": eventSignature,
    },
    "Webhook received",
  );

  return Promise.race([
    respondWithStillProcessingOnTimeout(state.RESPONSE_TIMEOUT),
    handleWebhookRequest({
      id: eventId,
      name: eventName,
      signature: eventSignature,
      payload: request.body,
    }),
  ]).catch((error) => {
    // app.webhooks.verifyAndReceive throws an AggregateError
    if (!Array.isArray(error.errors)) {
      state.githubWebhooksLog.error({ err: error }, "Handler error");
      return errorJsonResponse("An unexpected error occurred");
    }

    state.githubWebhooksLog.error({ err: error }, "Handler error");

    const err = Array.from(error.errors)[0];
    const errorMessage = err.message
      ? `${err.name}: ${err.message}`
      : "Error: An unexpected error occurred";
    const statusCode = typeof err.status !== "undefined" ? err.status : 500;

    return errorJsonResponse(errorMessage, statusCode);
  });
}

/**
 * @param {number} timeout
 * @returns {Promise<import("@netlify/functions").BuilderResponse>}
 */
function respondWithStillProcessingOnTimeout(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(jsonResponse({ stillProcessing: true }, 202));
    }, timeout).unref();
  });
}

/**
 * @param {any} event
 * @returns {Promise<import("@netlify/functions").BuilderResponse>}
 */
async function handleWebhookRequest(event) {
  await setupApp();
  await state.octokitApp.webhooks.verifyAndReceive(event);

  return jsonResponse({ ok: true });
}

function jsonResponse(data, status = 200) {
  return {
    statusCode: status,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

function errorJsonResponse(error, status = 500) {
  return jsonResponse({ error }, status);
}
