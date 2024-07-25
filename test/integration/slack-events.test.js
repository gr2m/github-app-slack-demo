// @ts-check

import Bolt from "@slack/bolt";
import test from "ava";
import AxiosMockAdapter from "axios-mock-adapter";
import fetchMock from "fetch-mock";
import { App as OctokitApp, Octokit } from "octokit";

import main from "../../main.js";
import { createMockLoggerAndLogs, DUMMY_PRIVATE_KEY } from "../mocks.js";

const TestOctokit = Octokit.defaults({
  throttle: { enabled: false },
  retry: { enabled: false },
});

test("app_home_opened event", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit,
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
  // mock webhook verification
  boltApp.authorize = async () => ({});
  // mock requests to Slack API
  boltApp.client.makeRequest = (method, body, headers) => {
    throw Object.assign(new Error(`Unexpected request`), {
      method,
      body,
      headers,
    });
  };
  const viewPublishCalls = [];
  boltApp.client.views.publish = async (args) => {
    viewPublishCalls.push(args);
  };

  const payload = {
    token: "btDs7gU7aMcu3YjR62kL5RtM",
    team_id: "T02ATETT3B7",
    api_app_id: "A07DBJVGQ59",
    event: {
      type: "app_home_opened",
      user: "U02APP3SU2J",
      channel: "D07DE71KE3W",
      tab: "home",
      view: {},
      event_ts: "1721886502.703544",
    },
    type: "event_callback",
    event_id: "Ev07DJTHRBGF",
    event_time: 1721886502,
    authorizations: [],
    is_ext_shared_channel: false,
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(viewPublishCalls, "boltApp.client.views.publish() calls");
});

test("/hello-github unknown", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit,
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "unknown",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(respondCalls, "respond calls");
});

test("/hello-github help", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit,
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "help",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(respondCalls, "respond calls");
});

test("/hello-github subscribe not-a-full-repo-name", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit,
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "subscribe+not-a-full-repo-name",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(respondCalls, "respond calls");
});

test("/hello-github subscribe monalisa/smile - no installation", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];
  const octokitFetchMock = fetchMock
    .sandbox()
    .getOnce("path:/repos/monalisa/smile/installation", 404)
    .getOnce("path:/app", 200);

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit.defaults({ request: { fetch: octokitFetchMock } }),
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "subscribe+monalisa/smile",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(respondCalls, "respond calls");
});

test("/hello-github subscribe monalisa/smile - no variable", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];
  const octokitFetchMock = fetchMock
    .sandbox()
    .getOnce("path:/repos/monalisa/smile/installation", {
      id: 1,
    })
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<token>",
    })
    .getOnce(
      "path:/repos/monalisa/smile/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      404
    )
    .postOnce("path:/repos/monalisa/smile/actions/variables", 201, {
      functionMatcher(url, { method, body }) {
        requests.push([method, new URL(url).pathname, JSON.parse(body)]);
        return true;
      },
    });

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit.defaults({ request: { fetch: octokitFetchMock } }),
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "subscribe+monalisa/smile",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(requests, "requests");
  t.snapshot(respondCalls, "respond calls");
});

test("/hello-github subscribe monalisa/smile - existing variable", async (t) => {
  // Arrange
  const [logger, logs] = createMockLoggerAndLogs();
  const requests = [];
  const octokitFetchMock = fetchMock
    .sandbox()
    .getOnce("path:/repos/monalisa/smile/installation", {
      id: 1,
    })
    .postOnce("path:/app/installations/1/access_tokens", {
      token: "<token>",
    })
    .getOnce(
      "path:/repos/monalisa/smile/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      {
        value: JSON.stringify({
          foo: "bar",
        }),
      }
    )
    .patchOnce(
      "path:/repos/monalisa/smile/actions/variables/HELLO_SLACK_SUBSCRIPTIONS",
      200,
      {
        functionMatcher(url, { method, body }) {
          requests.push([method, new URL(url).pathname, JSON.parse(body)]);
          return true;
        },
      }
    );

  const octokitApp = new OctokitApp({
    appId: 1,
    privateKey: DUMMY_PRIVATE_KEY,
    webhooks: {
      secret: "secret",
    },
    Octokit: TestOctokit.defaults({ request: { fetch: octokitFetchMock } }),
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
  // mock webhook verification
  boltApp.authorize = async () => ({});

  const mock = new AxiosMockAdapter(boltApp.axios, {
    onNoMatch: "throwException",
  });

  const respondCalls = [];
  mock
    .onPost("https://slack.test", {
      asymmetricMatch: function (actual) {
        respondCalls.push(actual);
        return true;
      },
    })
    .reply(200);

  const payload = {
    team_id: "T02ATETT3B7",
    team_domain: "gr2m",
    channel_id: "C07DQTAMKAS",
    channel_name: "test-hello-github",
    user_id: "U02APP3SU2J",
    user_name: "gregor",
    command: "/hello-github",
    text: "subscribe+monalisa/smile",
    api_app_id: "A07DBJVGQ59",
    is_enterprise_install: "false",
    response_url: "https://slack.test",
    trigger_id: "7461069880567.2367503921381.9506161dae0667c99560d2c7b9a58f16",
  };

  main({ octokitApp, boltApp });

  // Act
  const slackEvent = {
    body: payload,
    async ack(response) {
      return {
        statusCode: 200,
        body: response ?? "",
      };
    },
  };

  await boltApp.processEvent(slackEvent);

  // Assert
  t.snapshot(logs, "logs");
  t.snapshot(requests, "requests");
  t.snapshot(respondCalls, "respond calls");
});
