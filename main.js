// @ts-check

const USAGE = `Usage: \`/hello-github subscribe [repository]\`
Example: \`/hello-github subscribe monalisa/smile\``;

/**
 * @param {object} options
 * @param {import("octokit").App} options.octokitApp
 * @param {import("@slack/bolt").App} options.boltApp
 * @param {import("@slack/oauth").InstallationStore} options.boltInstallationStore
 * @param {ReturnType<import("./lib/subscriptions-store").getSubscriptionsStore>} options.subscriptionsStore
 * @param {{ slackAppId: string, slackCommand: string }} options.settings
 */
export default async function main({
  octokitApp,
  boltApp,
  boltInstallationStore,
  subscriptionsStore,
  settings,
}) {
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
              text: "Usage: ${USAGE}",
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
    async ({ command, respond, logger, context, ack }) => {
      await ack();
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
            },
          );
          installationId = installation.id;
        } catch (error) {
          logger.error(
            { err: error, owner, repo },
            "App is not installed on repository",
          );

          const { data: appinfo } =
            await octokitApp.octokit.request("GET /app");

          // TODO: respond with install button.
          await respond(
            `GitHub App is not installed on \`${repository}\`. Install at ${appinfo.html_url}/installations/new`,
          );
          return;
        }

        const installationOctokit =
          await octokitApp.getInstallationOctokit(installationId);

        let subscription = await subscriptionsStore.get({
          owner,
          repo,
          slackAppId: settings.slackAppId,
          githubInstallationId: installationId,
          teamId: command.team_id,
          channelId: command.channel_id,
        });

        if (subscription) {
          logger.info(
            {
              owner,
              repo,
              slackAppId: settings.slackAppId,
              githubInstallationId: installationId,
              teamId: command.team_id,
              channelId: command.channel_id,
              ...subscription,
            },
            "Subscription found",
          );
        } else {
          subscription = {
            slackEnterpriseId: Boolean(command.enterprise_id),
          };

          await subscriptionsStore.set(
            {
              owner,
              repo,
              slackAppId: settings.slackAppId,
              githubInstallationId: installationId,
              teamId: command.team_id,
              channelId: command.channel_id,
            },
            subscription,
          );

          logger.info(
            {
              owner,
              repo,

              slackAppId: settings.slackAppId,
              githubInstallationId: installationId,
              teamId: command.team_id,
              channelId: command.channel_id,

              ...subscription,
            },
            "Subscription added to store",
          );
        }

        await respond(
          `subscribed to <https://github.com/${repository}|${repository}>`,
        );
        return;
      }

      logger.info("Received unknown subcommand");
      await respond(`Unknown subcommand: \`${subcommand}\`\n\n${USAGE}`);
    },
  );

  // https://docs.github.com/webhooks/webhook-events-and-payloads?actionType=opened#issues
  octokitApp.webhooks.on("issues.opened", async ({ id, payload, octokit }) => {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const issueNumber = payload.issue.number;
    // @ts-expect-error - .installation is not defined for manual hooks, but always is for app hooks.
    const installationId = Number(payload.installation.id);

    octokit.log.info(
      {
        owner,
        repo,
        issueNumber,
      },
      "An issue was opened",
    );

    // get all subscriptions for the given repository and slack app
    const subscriptionKeys =
      await subscriptionsStore.getSubscriptionKeysForRepository({
        owner,
        repo,
        slackAppId: settings.slackAppId,
        githubInstallationId: installationId,
      });

    if (subscriptionKeys.length === 0) {
      octokit.log.info(
        {
          owner,
          repo,
          appId: settings.slackAppId,
          installationId,
        },
        "No subscriptions found",
      );
      return;
    }

    let currentTeamId;
    let currentBot;
    for (const key of subscriptionKeys) {
      const [channelId, teamId] = key.split("/").reverse();

      if (currentTeamId !== teamId) {
        const installation = await boltInstallationStore.fetchInstallation({
          teamId: teamId,

          // no support for enterprise installs yet
          isEnterpriseInstall: false,
          enterpriseId: "<tbd-enterpriseId>",
        });

        if (!installation) {
          octokit.log.warn(
            {
              key,
              teamId,
            },
            "Slack installation not found",
          );
          continue;
        }

        currentBot = installation.bot;
      }

      await boltApp.client.chat.postMessage({
        token: currentBot.token,
        channel: channelId,
        text: `New issue opened: ${payload.issue.html_url}`,
      });

      octokit.log.info(
        {
          owner,
          repo,
          issueNumber,
          teamId,
          channelId,
        },
        "Sent message to Slack",
      );
    }
  });

  // Handle errors occuring in GitHub Webhooks
  // https://github.com/octokit/webhooks.js#webhooksonerror
  octokitApp.webhooks.onError((error) => {
    octokitApp.log.error(error, "An error occurred in a webhook handler");
  });
}
