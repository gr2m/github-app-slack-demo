import { App, Octokit } from 'octokit';
import githubApp from '../../github-app';
import pino from 'pino';


const log = pino();
const octokitLog = log.child({ name: 'octokit' });

const setupApp = async () => {
  try {
    const app = new App({
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
    throw error;
  }
};

/**
 * Netlify function to handle webhook event requests from GitHub
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 */
export const handler = async (event, context) => {
  if (event.httpMethod !== "POST"){
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }
  try {
    const app = await setupApp();
    await app.webhooks.verifyAndReceive({
      id: event.headers["X-GitHub-Delivery"] ||
      event.headers["x-github-delivery"],
      name: event.headers["X-GitHub-Event"] || event.headers["x-github-event"],
      signature: event.headers["X-Hub-Signature-256"] ||
      event.headers["x-hub-signature-256"],
      payload: JSON.parse(event.body)
    })
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    log.error(error, 'Handler error');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
