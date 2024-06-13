import { cleanEnv, str, num } from "envalid";
import AppWebhookRelay from "github-app-webhook-relay-polling";
import { App, Octokit } from "octokit";
import { pino } from "pino";

import githubApp from "../src/github-app.js";

const env = cleanEnv(process.env, {
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),
});
const log = pino();
const octokitLog = log.child({ name: "octokit" });

// instantiate the Octokit app
const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
  webhooks: {
    // value does not matter, but has to be set.
    secret: "secret",
  },
  Octokit: Octokit.defaults({
    userAgent: "gr2m/github-app-slack-demo",
  }),
  // TODO: pre-binding should not be necessary, seems like a new bug in Octokit
  log: {
    debug: octokitLog.debug.bind(octokitLog),
    info: octokitLog.info.bind(octokitLog),
    warn: octokitLog.warn.bind(octokitLog),
    error: octokitLog.error.bind(octokitLog),
  },
});

// verify credentials and say hi
// https://docs.github.com/rest/apps/apps#get-the-authenticated-app
const { data: appInfo } = await app.octokit.request("GET /app");
log.info({ slug: appInfo.slug, url: appInfo.html_url }, `Authenticated`);

// register webhook handlers
await githubApp(app);

const relay = new AppWebhookRelay({
  app,
});

relay.on("error", (error) => {
  console.log("error: %s", error);
});

relay.start();
