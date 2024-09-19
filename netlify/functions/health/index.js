import pino from "pino";

import { cleanEnv, str } from "envalid";

import { getInstallationStore } from "../../../lib/slack-installation-store.js";

const env = cleanEnv(process.env, {
  // netlify environment variables
  SITE_ID: str(),
  NETLIFY_PERSONAL_ACCESS_TOKEN: str(),
});

const boltInstallationStore = getInstallationStore({
  siteID: env.SITE_ID,
  token: env.NETLIFY_PERSONAL_ACCESS_TOKEN,
});

// export for testing
export const healthLog = pino().child({ function: "health" });

/**
 * Netlify function for health check
 */
export async function handler() {
  healthLog.info("Health check");

  await boltInstallationStore.fetchInstallation({ teamId: "T06SS47EH52" });

  return {
    body: JSON.stringify({ ok: true }),
    statusCode: 200,
  };
}
