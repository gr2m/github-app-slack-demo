import { cleanEnv, str, num } from "envalid";
import AppWebhookRelay from "github-app-webhook-relay-polling";
import { App, Octokit } from "octokit";
import { pino } from "pino";

import githubApp from "../github-app.js";

const env = cleanEnv(process.env, {
  GITHUB_APP_ID: num(),
  GITHUB_APP_PRIVATE_KEY: str(),
});
const log = pino();

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
    log: log.child({ name: "octokit" }),
  }),
});

// verify credentials and say hi
// https://docs.github.com/rest/apps/apps#get-the-authenticated-app
const { data: appInfo } = await app.octokit.request("GET /app");
console.log(`Authenticated as ${appInfo.slug} (${appInfo.html_url})!`);

// register webhook handlers
await githubApp(app);

const relay = new AppWebhookRelay({
  app,
});

relay.on("error", (error) => {
  console.log("error: %s", error);
});

relay.start();
