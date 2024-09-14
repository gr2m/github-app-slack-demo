// @ts-check

import Bolt from "@slack/bolt";
import test from "ava";
import fetchMock from "fetch-mock";
import { App as OctokitApp, Octokit } from "octokit";

import main from "../../main.js";
import { createMockLoggerAndLogs, DUMMY_PRIVATE_KEY } from "../mocks.js";

const TestOctokit = Octokit.defaults({
  throttle: { enabled: false },
  retry: { enabled: false },
});

test("issues.opened event", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const mock = fetchMock
    .sandbox()
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<installation access token>",
    })
    .getOnce(
      "path:/repos/octocat/hello-world/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      {
        value: JSON.stringify({
          B12345678: {
            slackChannelId: "C12345678",
            githubInstallationId: 1,
          },
        }),
      },
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

  // mock requests to Slack API
  boltApp.client.makeRequest = (method, body, headers) => {
    throw Object.assign(new Error(`Unexpected request`), {
      method,
      body,
      headers,
    });
  };
  boltApp.client.auth.test = async (args) => {
    return {
      bot_id: "B12345678",
    };
  };
  const chatPostMessageCalls = [];
  boltApp.client.chat.postMessage = async (args) => {
    chatPostMessageCalls.push(args);
    return {
      ok: true,
    };
  };

  main({ octokitApp, boltApp, settings: { slackCommand: "/hello-github" } });

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
        html_url: "<html url>",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    },
  });

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(chatPostMessageCalls, "chatPostMessageCalls");
  t.true(fetchMock.done());
});

test("issues.opened event - subscription not found", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const mock = fetchMock
    .sandbox()
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<installation access token>",
    })
    .getOnce(
      "path:/repos/octocat/hello-world/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      404,
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

  main({ octokitApp, boltApp, settings: { slackCommand: "/hello-github" } });

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
        html_url: "<html url>",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    },
  });

  // Assert
  t.snapshot(logs, "logs");
  t.true(fetchMock.done());
});

test("issues.opened event - subscription found but not for app", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const mock = fetchMock
    .sandbox()
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<installation access token>",
    })
    .getOnce(
      "path:/repos/octocat/hello-world/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      {
        value: JSON.stringify({
          B007: {
            slackChannelId: "C007",
            githubInstallationId: 2,
          },
        }),
      },
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

  // mock requests to Slack API
  boltApp.client.makeRequest = (method, body, headers) => {
    throw Object.assign(new Error(`Unexpected request`), {
      method,
      body,
      headers,
    });
  };
  boltApp.client.auth.test = async (args) => {
    return {
      bot_id: "B12345678",
    };
  };

  main({ octokitApp, boltApp, settings: { slackCommand: "/hello-github" } });

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
        html_url: "<html url>",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    },
  });

  // Assert
  t.snapshot(logs, "logs");
  t.true(fetchMock.done());
});

test("issues.opened event - subscription found but not for installation", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const mock = fetchMock
    .sandbox()
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<installation access token>",
    })
    .getOnce(
      "path:/repos/octocat/hello-world/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      {
        value: JSON.stringify({
          B12345678: {
            slackChannelId: "C12345678",
            githubInstallationId: 2,
          },
        }),
      },
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

  // mock requests to Slack API
  boltApp.client.makeRequest = (method, body, headers) => {
    throw Object.assign(new Error(`Unexpected request`), {
      method,
      body,
      headers,
    });
  };
  boltApp.client.auth.test = async (args) => {
    return {
      bot_id: "B12345678",
    };
  };

  main({ octokitApp, boltApp, settings: { slackCommand: "/hello-github" } });

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
        html_url: "<html url>",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    },
  });

  // Assert
  t.snapshot(logs, "logs");
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

  main({ octokitApp, boltApp, settings: { slackCommand: "/hello-github" } });

  // Act
  await t.throwsAsync(() =>
    octokitApp.webhooks.receive({
      id: "1",
      name: "issues",
      payload: {},
    }),
  );

  // Assert
  t.snapshot(logs, "logs");
  t.true(fetchMock.done());
});
