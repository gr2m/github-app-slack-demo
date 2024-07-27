// @ts-check

const USAGE = `Usage: \`/hello-github subscribe [repository]\`
Example: \`/hello-github subscribe monalisa/smile\``;

/**
 * @param {object} options
 * @param {import("@slack/bolt").App} options.boltApp
 * @param {import("octokit").App} options.octokitApp
 * @param {{ slackCommand: string }} options.settings
 */
export default async function main({ octokitApp, boltApp, settings }) {
  // https://docs.github.com/webhooks/webhook-events-and-payloads?actionType=opened#issues
  octokitApp.webhooks.on("issues.opened", async ({ id, payload, octokit }) => {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const issueNumber = payload.issue.number;

    octokit.log.info(
      {
        owner,
        repo,
        issueNumber,
      },
      "An issue was opened"
    );

    // get the subscription settings
    const {
      data: { value },
    } = await octokit
      .request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
        owner,
        repo,
        name: `HELLO_SLACK_SUBSCRIPTIONS`,
      })
      .catch(() => ({ data: { value: false } }));

    if (value === false) {
      octokit.log.info(
        {
          owner,
          repo,
        },
        "No subscriptions found"
      );
      return;
    }

    const subscriptions = JSON.parse(value);

    // get slack app id
    const result = await boltApp.client.auth.test();
    const appSubscription = subscriptions[result.bot_id];

    if (!appSubscription) {
      octokit.log.info(
        {
          owner,
          repo,
          appId: result.bot_id,
          subscriptionAppIds: Object.keys(subscriptions),
        },
        "Subscription not found for app"
      );
      return;
    }

    // make sure subscription is for current installation
    if (appSubscription.githubInstallationId !== payload.installation.id) {
      octokit.log.info(
        {
          owner,
          repo,
          installationId: payload.installation.id,
          subscriptionInstallationId: appSubscription.githubInstallationId,
        },
        "Subscription not for current installation"
      );
      return;
    }

    // send message to slack
    const message = `New issue opened: ${payload.issue.html_url}`;
    await boltApp.client.chat.postMessage({
      channel: appSubscription.slackChannelId,
      text: message,
    });

    octokit.log.info(
      {
        owner,
        repo,
        issueNumber,
        slackChannelId: appSubscription.slackChannelId,
      },
      "Message sent to slack"
    );
  });

  // Handle errors occuring in GitHub Webhooks
  octokitApp.webhooks.onError((error) => {
    octokitApp.log.error(error, "An error occurred in a webhook handler");
  });

  // https://api.slack.com/events/app_home_opened
  boltApp.event("app_home_opened", async ({ event, client, logger }) => {
    logger.info("app_home_opened event received");

    // view.publish is the method that your app uses to push a view to the Home tab
    await client.views.publish({
      // the user that opened your app's app home
      user_id: event.user,

      // the view object that appears in the app home
      view: {
        type: "home",
        callback_id: "home_view",

        // body of the view
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Hello, GitHub!* :tada:",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "TODO: Put something useful in here",
            },
          },
        ],
      },
    });
  });

  // https://api.slack.com/interactivity/slash-commands
  // https://slack.dev/bolt-js/concepts#commands
  boltApp.command(
    settings.slackCommand,
    async ({ command, respond, logger, context }) => {
      const [subcommand, repository] = command.text.split(/[+ ]+/g);

      if (subcommand === "help") {
        logger.info("Received help command");
        await respond(USAGE);
        return;
      }

      if (subcommand === "subscribe") {
        const [owner, repo] = repository.split("/");
        // naive owner/repo string validation
        if (!repo) {
          logger.info("Received subscribe with invalid repository");
          await respond(`Invalid repository: \`${repository}\`\n\n${USAGE}`);
          return;
        }

        // get installation ID
        let installationId;
        try {
          const { data: installation } = await octokitApp.octokit.request(
            "GET /repos/{owner}/{repo}/installation",
            {
              owner,
              repo,
            }
          );
          installationId = installation.id;
        } catch (error) {
          logger.error(
            { err: error, owner, repo },
            "App is not installed on repository"
          );

          const { data: appinfo } = await octokitApp.octokit.request(
            "GET /app"
          );

          // TODO: respond with install button.
          await respond(
            `GitHub App is not installed on \`${repository}\`. Install at ${appinfo.html_url}/installations/new`
          );
          return;
        }

        const installationOctokit = await octokitApp.getInstallationOctokit(
          installationId
        );

        const { data } = await installationOctokit
          .request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
            owner,
            repo,
            name: `HELLO_SLACK_SUBSCRIPTIONS`,
          })
          .catch(() => ({ data: { value: false } }));

        const value = data.value;
        if (value === false) {
          // create the variable
          const botId = context.botId;
          const subscriptions = {
            [botId]: {
              slackChannelId: command.channel_id,
              githubInstallationId: installationId,
            },
          };
          const newValue = JSON.stringify(subscriptions);

          await installationOctokit.request(
            "POST /repos/{owner}/{repo}/actions/variables",
            {
              owner,
              repo,
              name: `HELLO_SLACK_SUBSCRIPTIONS`,
              value: newValue,
            }
          );

          logger.info(
            {
              owner,
              repo,
              botId,
              slackChannelId: command.channel_id,
              githubInstallationId: installationId,
            },
            "Variable created in repository"
          );
        } else {
          // update the variable
          const subscriptions = JSON.parse(value);
          const botId = context.botId;
          subscriptions[botId] = {
            slackChannelId: command.channel_id,
            githubInstallationId: installationId,
          };
          const newValue = JSON.stringify(subscriptions);

          await installationOctokit.request(
            "PATCH /repos/{owner}/{repo}/actions/variables/{name}",
            {
              owner,
              repo,
              name: `HELLO_SLACK_SUBSCRIPTIONS`,
              value: newValue,
            }
          );

          logger.info(
            {
              owner,
              repo,
              botId,
              slackChannelId: command.channel_id,
              githubInstallationId: installationId,
            },
            "Variable updated in repository"
          );
        }

        await respond(
          `subscribed to <https://github.com/${repository}|${repository}>`
        );
        return;
      }

      logger.info("Received unknown subcommand");
      await respond(`Unknown subcommand: \`${subcommand}\`\n\n${USAGE}`);
    }
  );
}
