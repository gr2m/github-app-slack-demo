import crypto from "node:crypto";

import registerGitHubApp from "register-github-app";

run();

async function run() {
  const appCredentials = await registerGitHubApp({
    url: "https://github.com/gr2m/github-app-slack-demo",
    name: "hello-slack-local-<your-github-username>",
    default_events: ["issues"],
    default_permissions: {
      actions_variables: "write",
      issues: "write",
      metadata: "read",
    },
    description:
      "Test app for local development of [gr2m/github-app-slack-demo](https://github.com/gr2m/github-app-slack-demo)",
    public: false,
    hook_attributes: {
      // we pull the events for local delivery, so the target URL does not matter
      url: "https://example.com/",
      active: true,
    },
  });

  // convert private key to pkcs8 format (recommended for better cross plattform support)
  const privateKeyPKCS8 = String(
    crypto.createPrivateKey(appCredentials.pem).export({
      type: "pkcs8",
      format: "pem",
    })
  );
  const singleLinePrivateKey = privateKeyPKCS8.trim().replace(/\n/g, "\\n");

  // ensure key boundaries include 'RSA PRIVATE KEY' as required by probot
  const singleLinePrivateKeyRSA = singleLinePrivateKey.replace(
    /(-----(BEGIN|END)) (PRIVATE KEY-----)/g,
    "$1 RSA $3"
  );

  console.log(`Create or update your .env file with the following values:

GITHUB_APP_ID=${appCredentials.id}
GITHUB_APP_PRIVATE_KEY="${singleLinePrivateKeyRSA}"
`);
}
