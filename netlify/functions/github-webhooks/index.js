import { cleanEnv, str, num } from "envalid";
import { App, Octokit } from "octokit";
import pino from "pino";

import githubApp from "../../../github-app";

const env = cleanEnv(process.env, {
  // GitHub App credentials
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),
  GITHUB_OAUTH_CLIENT_ID: str(),
  GITHUB_OAUTH_CLIENT_SECRET: str(),
  GITHUB_WEBHOOK_SECRET: str(),
});

const log = pino();
const octokitLog = log.child({ name: "octokit" });

let app;
let setupAppError;

/**
 * Set up the GitHub App. If the app is already set up, return it.
 * @returns {Promise<App>}
 * @throws {Error}
 * */
async function setupApp() {
  if (app) return app;
  if (setupAppError) throw setupAppError;
  try {
    octokitLog.info("Setting up app");
    app = new App({
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
        debug: octokitLog.debug.bind(octokitLog),
        info: octokitLog.info.bind(octokitLog),
        warn: octokitLog.warn.bind(octokitLog),
        error: octokitLog.error.bind(octokitLog),
      },
    });

    app.log.info("Verifying app access");

    const { data: appInfo } = await app.octokit.request("GET /app");
    log.info({ slug: appInfo.slug, url: appInfo.html_url }, `Authenticated`);

    app.log.info("registering webhook handlers");

    await githubApp(app);

    return app;
  } catch (error) {
    log.error(error, "Failed to set up app");
    setupAppError = error;
    throw error;
  }
}

/**
 * Netlify function to handle webhook event requests from GitHub
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 */
export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
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

  const eventName =
    event.headers["X-GitHub-Event"] || event.headers["x-github-event"];
  const eventId =
    event.headers["X-GitHub-Delivery"] || event.headers["x-github-delivery"];
  const eventSignature =
    event.headers["X-Hub-Signature-256"] ||
    event.headers["x-hub-signature-256"];

  octokitLog.info(
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
      response.statusCode = 202;
      response.end("still processing\n");
    }, 9000).unref();

    const app = await setupApp();
    await app.webhooks.verifyAndReceive({
      id: eventId,
      name: eventName,
      signature: eventSignature,
      payload: JSON.parse(event.body),
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
    octokitLog.error({ err: error }, "Handler error");
    clearTimeout(timeout);

    const err = Array.from(error.errors)[0];
    const errorMessage = err.message
      ? `${err.name}: ${err.message}`
      : "Error: An Unspecified error occurred";
    const statusCode = typeof err.status !== "undefined" ? err.status : 500;

    return {
      statusCode,
      body: errorMessage,
    };
  }
}
