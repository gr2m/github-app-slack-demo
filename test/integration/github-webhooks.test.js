// @ts-check

import Bolt from "@slack/bolt";
import test from "ava";
import fetchMock from "fetch-mock";
import { App as OctokitApp, Octokit } from "octokit";

import main from "../../app.js";
import { createMockLoggerAndLogs, DUMMY_PRIVATE_KEY } from "../mocks.js";

const TestOctokit = Octokit.defaults({
  throttle: { enabled: false },
  retry: { enabled: false },
});

test("issues.opened event", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];
  const mock = fetchMock
    .sandbox()
    .post("https://api.github.com/app/installations/1/access_tokens", {
      token: "<installation access token>",
    })
    .post(
      "https://api.github.com/repos/octocat/hello-world/issues/1/comments",
      (url, { body, method }) => {
        // split out asserting the right request body from request matching
        // because an assert error would be swallowed by fetchMock
        requests.push({ method, path: new URL(url).pathname, body });
        return true;
      }
    );
  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit.defaults({
      request: {
        fetch: mock,
      },
    }),
    log: {
      error: logger.error.bind(logger),
      warn: logger.warn.bind(logger),
      info: logger.info.bind(logger),
      debug: logger.debug.bind(logger),
    },
  });
  const boltApp = new Bolt.App({
    signingSecret: "",
    token: "",
    logger: {
      debug: logger.debug.bind(logger),
      info: logger.info.bind(logger),
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
      getLevel: () => "debug",
      setLevel: (level) => {
        logger.level = level;
      },
      setName: (name) => {},
    },
  });

  main({ octokitApp, boltApp });

  // Act
  await octokitApp.webhooks.receive({
    id: "1",
    name: "issues",
    payload: {
      action: "opened",
      issue: {
        number: 1,
        title: "Issue title",
        body: "Issue body",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
    },
  });

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(requests, "requests");
  t.true(fetchMock.done());
});

test("error in event handler", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const mock = fetchMock.sandbox();
  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit.defaults({
      request: {
        fetch: mock,
      },
    }),
    log: {
      error: logger.error.bind(logger),
      warn: logger.warn.bind(logger),
      info: logger.info.bind(logger),
      debug: logger.debug.bind(logger),
    },
  });
  const boltApp = new Bolt.App({
    signingSecret: "",
    token: "",
    logger: {
      debug: logger.debug.bind(logger),
      info: logger.info.bind(logger),
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
      getLevel: () => "debug",
      setLevel: (level) => {
        logger.level = level;
      },
      setName: (name) => {},
    },
  });

  octokitApp.webhooks.on("issues", async () => {
    throw new Error("error from event handler");
  });

  main({ octokitApp, boltApp });

  // Act
  await t.throwsAsync(() =>
    octokitApp.webhooks.receive({
      id: "1",
      name: "issues",
      payload: {},
    })
  );

  // Assert
  t.snapshot(logs, "logs");
  t.true(fetchMock.done());
});
