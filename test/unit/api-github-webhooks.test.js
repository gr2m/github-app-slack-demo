import test from "ava";
import { Octokit } from "octokit";

import { mockLog, DUMMY_PRIVATE_KEY } from "../mocks.js";

const TestOctokit = Octokit.defaults({
  throttle: { enabled: false },
  retry: { enabled: false },
});

test.before(async (t) => {
  process.env.GITHUB_APP_ID = "1";
  process.env.GITHUB_APP_PRIVATE_KEY = DUMMY_PRIVATE_KEY;
  process.env.GITHUB_OAUTH_CLIENT_ID = "<client-id>";
  process.env.GITHUB_OAUTH_CLIENT_SECRET = "<client-secret>";
  process.env.GITHUB_WEBHOOK_SECRET = "<webhook-secret>";
  process.env.SLACK_CLIENT_ID = "<slack-client-id>";
  process.env.SLACK_CLIENT_SECRET = "<slack-client-secret>";
  process.env.SLACK_SIGNING_SECRET = "<slack-signing-secret>";

  // we import dynamically as we need to set environment variables before importing
  const { state, setupApp, handler } = await import(
    "../../netlify/functions/github-webhooks/index.js"
  );

  t.context.state = state;
  t.context.state.Bolt = { App: function DummyBoltApp() {} };
  t.context.setupApp = setupApp;
  t.context.handler = handler;
});

test.beforeEach(async (t) => {
  // reset state
  t.context.state.octokitApp = undefined;
  t.context.state.setupAppError = undefined;
  t.context.state.main = () => {};
  t.context.state.Octokit = TestOctokit;
});

// we have to run tests sequentially as we are mutating global state
test.serial("setupApp", async (t) => {
  const { state, setupApp } = t.context;
  // arrange
  const logs = mockLog(state.githubWebhooksLog);

  // act
  await setupApp();

  // assert
  t.snapshot(logs, "logs");
});

test.serial("setupApp() - called twice", async (t) => {
  const { state, setupApp } = t.context;
  // arrange
  const logs = mockLog(state.githubWebhooksLog);

  // act
  await setupApp();
  await setupApp();

  // assert
  t.snapshot(logs, "logs");
});

test.serial("setupApp() with error", async (t) => {
  const { state, setupApp } = t.context;
  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  t.context.state.Octokit = {
    defaults: () => {
      throw new Error("oops");
    },
  };

  // act
  await t.throwsAsync(setupApp);

  // assert
  t.snapshot(logs, "logs");
});

test.serial("setupApp() with error - called twice", async (t) => {
  const { state, setupApp } = t.context;
  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  t.context.state.Octokit = {
    defaults: () => {
      throw new Error("oops");
    },
  };

  // act
  await t.throwsAsync(setupApp);
  await t.throwsAsync(setupApp);

  // assert
  t.snapshot(logs, "logs");
});

test.serial("POST /api/github-webhooks", async (t) => {
  const { state, handler } = t.context;

  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  const verifyAndReceiveCalls = [];
  state.octokitApp = {
    webhooks: {
      verifyAndReceive() {
        verifyAndReceiveCalls.push(arguments);
      },
    },
  };

  // act
  const response = await handler({
    httpMethod: "POST",
    body: "<event-payload>",
    headers: {
      "x-github-event": "<event-name>",
      "x-github-delivery": "<event-delivery-guid>",
      "x-hub-signature-256": "<event-delivery-signature>",
    },
  });

  // assert
  t.snapshot(logs, "logs");
  t.snapshot(response, "response");
  t.snapshot(verifyAndReceiveCalls, "app.webhooks.verifyAndReceive() calls");
});

test.serial("POST /api/github-webhooks with timeout", async (t) => {
  const { state, handler } = t.context;

  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  const verifyAndReceiveCalls = [];
  state.RESPONSE_TIMEOUT = 0;
  state.octokitApp = {
    webhooks: {
      async verifyAndReceive() {
        // simulate a long running operation
        // ideally we would mock time but for a single test it's not worth it
        await new Promise((resolve) => setTimeout(resolve, 100));

        verifyAndReceiveCalls.push(arguments);
      },
    },
  };

  // act
  const response = await handler({
    httpMethod: "POST",
    body: "<event-payload>",
    headers: {
      "x-github-event": "<event-name>",
      "x-github-delivery": "<event-delivery-guid>",
      "x-hub-signature-256": "<event-delivery-signature>",
    },
  });

  // assert
  t.snapshot(logs, "logs");
  t.snapshot(response, "response");
  t.snapshot(verifyAndReceiveCalls, "app.webhooks.verifyAndReceive() calls");
});

test.serial("error in app.webhooks.verifyAndReceive()", async (t) => {
  const { state, handler } = t.context;

  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  state.octokitApp = {
    webhooks: {
      verifyAndReceive() {
        throw new AggregateError(
          [
            Object.assign(new Error("<verifyAndReceive-error>"), {
              status: 400,
            }),
          ],
          "Hello",
        );
      },
    },
  };

  // act
  const response = await handler({
    httpMethod: "POST",
    body: "<event-payload>",
    headers: {
      "x-github-event": "<event-name>",
      "x-github-delivery": "<event-delivery-guid>",
      "x-hub-signature-256": "<event-delivery-signature>",
    },
  });

  // assert
  t.snapshot(response, "response");
  t.snapshot(logs, "logs");
});

test.serial(
  "unexpected error in app.webhooks.verifyAndReceive()",
  async (t) => {
    const { state, handler } = t.context;

    // arrange
    const logs = mockLog(state.githubWebhooksLog);
    state.octokitApp = {
      webhooks: {
        verifyAndReceive() {
          throw new AggregateError([0], "oops");
        },
      },
    };

    // act
    const response = await handler({
      httpMethod: "POST",
      body: "<event-payload>",
      headers: {
        "x-github-event": "<event-name>",
        "x-github-delivery": "<event-delivery-guid>",
        "x-hub-signature-256": "<event-delivery-signature>",
      },
    });

    // assert
    t.snapshot(response, "response");
    t.snapshot(logs, "logs");
  },
);

test.serial("Unexpected error in handler", async (t) => {
  const { state, handler } = t.context;

  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  state.octokitApp = {
    webhooks: {
      verifyAndReceive() {
        throw new Error("oops");
      },
    },
  };

  // act
  const response = await handler({
    httpMethod: "POST",
    body: "<event-payload>",
    headers: {
      "x-github-event": "<event-name>",
      "x-github-delivery": "<event-delivery-guid>",
      "x-hub-signature-256": "<event-delivery-signature>",
    },
  });

  // assert
  t.snapshot(response, "response");
  t.snapshot(logs, "logs");
});

test.serial("GET /api/github-webhooks", async (t) => {
  const { state, handler } = t.context;

  // arrange
  const logs = mockLog(state.githubWebhooksLog);
  state.octokitApp = {};

  // act
  const response = await handler({
    httpMethod: "GET",
  });

  // assert
  t.snapshot(response, "response");
  t.snapshot(logs, "logs");
});
