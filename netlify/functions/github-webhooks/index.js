// @ts-check

import Bolt from "@slack/bolt";
import { cleanEnv, str } from "envalid";
import { App as OctokitApp, Octokit } from "octokit";
import pino from "pino";

import main from "../../../main.js";
import { getInstallationStore } from "../../../lib/slack-installation-store.js";

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
    const boltInstallationStore = getInstallationStore();
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
      authorize: async (...args) => {
        console.log(`authorize`, { args });
        return {};
      },
    });

    state.githubWebhooksLog.info("Register Octokit and Bolt handlers");
    await state.main({
      octokitApp,
      boltApp,
      boltInstallationStore,
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
 * @param {import("@netlify/functions").HandlerEvent} event
 */
export default async function handler(event) {
  if (event.httpMethod !== "POST") {
    state.githubWebhooksLog.info(
      {
        method: event.httpMethod,
      },
      "Method not allowed",
    );

    /* The `405` status code in HTTP indicates that the method used in the request is not
      allowed for the specified resource. In the provided code snippet, when the
      `handler` function is called with an HTTP method other than `POST`, it returns a
      response with a status code of `405` along with an error message indicating that
      the method is not allowed for that endpoint. */
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
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
    "Webhook received",
  );

  return Promise.race([
    respondWithStillProcessingOnTimeout(state.RESPONSE_TIMEOUT),
    handleWebhookRequest(state.octokitApp, {
      id: eventId,
      name: eventName,
      signature: eventSignature,
      payload: event.body,
    }),
  ]).catch((error) => {
    // app.webhooks.verifyAndReceive throws an AggregateError
    if (!Array.isArray(error.errors)) {
      state.githubWebhooksLog.error({ err: error }, "Handler error");

      return new Response("Error: An unexpected error occurred", {
        status: 500,
      });
    }

    state.githubWebhooksLog.error({ err: error }, "Handler error");

    const err = Array.from(error.errors)[0];
    const errorMessage = err.message
      ? `${err.name}: ${err.message}`
      : "Error: An unexpected error occurred";
    const statusCode = typeof err.status !== "undefined" ? err.status : 500;

    return new Response(errorMessage, {
      status: statusCode,
    });
  });
}

/**
 * @param {number} timeout
 * @returns {Promise<Response>}
 */
function respondWithStillProcessingOnTimeout(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 202,
        }),
      );
    }, timeout).unref();
  });
}

/**
 * @param {import("octokit").App} octokitApp
 * @param {any} event
 * @returns
 */
async function handleWebhookRequest(octokitApp, event) {
  await setupApp();
  await octokitApp.webhooks.verifyAndReceive(event);

  return new Response("OK", {
    status: 200,
  });
}
