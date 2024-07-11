import { App, Octokit } from 'octokit';
import githubApp from '../../github-app';
import pino from 'pino';


const log = pino();
const octokitLog = log.child({ name: 'octokit' });

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
      app = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      oauth: {
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET
      },
      webhooks: {
        secret: process.env.GITHUB_WEBHOOK_SECRET,
      },
      Octokit: Octokit.defaults({
        userAgent: 'gr2m/github-app-slack-demo',
      }),
      log: {
        debug: octokitLog.debug.bind(octokitLog),
        info: octokitLog.info.bind(octokitLog),
        warn: octokitLog.warn.bind(octokitLog),
        error: octokitLog.error.bind(octokitLog),
      },
    });

    const { data: appInfo } = await app.octokit.request('GET /app');
    log.info({ slug: appInfo.slug, url: appInfo.html_url }, `Authenticated`);

    await githubApp(app);
    
    return app
  } catch (error) {
    log.error(error, 'Failed to set up app');
    setupAppError = error;
    throw error;
  }
};

/**
 * Netlify function to handle webhook event requests from GitHub
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 */
export async function handler (event, context) {
  if (event.httpMethod !== "POST"){
    return {
      statusCode: /* The `405` status code in HTTP indicates that the method used in the request is not
      allowed for the specified resource. In the provided code snippet, when the
      `handler` function is called with an HTTP method other than `POST`, it returns a
      response with a status code of `405` along with an error message indicating that
      the method is not allowed for that endpoint. */
      405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }
  
  try {
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      response.statusCode = 202;
      response.end("still processing\n");
    }, 9000).unref();

    const app = await setupApp();
    await app.webhooks.verifyAndReceive({
      id: event.headers["X-GitHub-Delivery"] ||
      event.headers["x-github-delivery"],
      name: event.headers["X-GitHub-Event"] || event.headers["x-github-event"],
      signature: event.headers["X-Hub-Signature-256"] ||
      event.headers["x-hub-signature-256"],
      payload: JSON.parse(event.body)
    })
    clearTimeout(timeout);

    app.webhooks.on('error', (error) => {
      log.error(error, 'Webhook error');
    });

    //TODO: Implement the event handler
    app.webhooks.on('event', (event) => {
      log.info({ event }, 'Webhook received');
    }
    );
    
    if (didTimeout) return {
      statusCode: 202,
      body: JSON.stringify({ ok: true }),
    };

    return {
      statusCode: 202,
    }

  } catch (error) {
    log.error(error, 'Handler error');
    clearTimeout(timeout);

    const err = Array.from((error).errors)[0];
    const errorMessage = err.message
      ? `${err.name}: ${err.message}`
      : "Error: An Unspecified error occurred";
    const statusCode = typeof err.status !== "undefined" ? err.status : 500;

    return {
      statusCode,
      body: errorMessage,
    }
    
  }
};
