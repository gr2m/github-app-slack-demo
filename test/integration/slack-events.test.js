// @ts-check

import Bolt from "@slack/bolt";
import test from "ava";
import { App as OctokitApp, Octokit } from "octokit";

import main from "../../app.js";
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
  boltApp.makeRequest = (method, body, headers) => {
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
      view: {
        id: "V07D8S45XFF",
        team_id: "T02ATETT3B7",
        type: "home",
        blocks: [
          {
            type: "section",
            block_id: "RWfUa",
            text: {
              type: "mrkdwn",
              text: "*Hello, GitHub!* :tada:",
              verbatim: false,
            },
          },
          { type: "divider", block_id: "O9N+f" },
          {
            type: "section",
            block_id: "Ptd6L",
            text: {
              type: "mrkdwn",
              text: "TODO: Put something useful in here?",
              verbatim: false,
            },
          },
        ],
        private_metadata: "",
        callback_id: "home_view",
        state: { values: {} },
        hash: "1721886401.hryPbpqU",
        title: { type: "plain_text", text: "View Title", emoji: true },
        clear_on_close: false,
        notify_on_close: false,
        close: null,
        submit: null,
        previous_view_id: null,
        root_view_id: "V07D8S45XFF",
        app_id: "A07DBJVGQ59",
        external_id: "",
        app_installed_team_id: "T02ATETT3B7",
        bot_id: "B07D53PJ0ES",
      },
      event_ts: "1721886502.703544",
    },
    type: "event_callback",
    event_id: "Ev07DJTHRBGF",
    event_time: 1721886502,
    authorizations: [
      {
        enterprise_id: null,
        team_id: "T02ATETT3B7",
        user_id: "U07DQCDMH3K",
        is_bot: true,
        is_enterprise_install: false,
      },
    ],
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
