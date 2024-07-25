// @ts-check

const SUPPORTED_SUBCOMMANDS = ["help", "subscribe"];

const USAGE = `Usage: \`/hello-github subscribe [repository]\`
Example: \`/hello-github subscribe monalisa/smile\``;

/**
 * @param {object} options
 * @param {import("@slack/bolt").App} options.boltApp
 * @param {import("octokit").App} options.octokitApp
 */
export default async function main({ octokitApp, boltApp }) {
  octokitApp.webhooks.on("issues.opened", async ({ id, payload, octokit }) => {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const issueNumber = payload.issue.number;

    octokit.log.info(
      {
        issue: payload.issue.html_url,
        title: payload.issue.title,
      },
      "An issue was opened"
    );

    // add comment to the issue
    // https://docs.github.com/rest/issues/comments#create-an-issue-comment
    const { data: comment } = await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo,
        issue_number: issueNumber,
        body: "Hello, world! 🌍",
      }
    );

    octokit.log.info(
      { comment: comment.html_url },
      "Added a comment to an issue"
    );
  });

  // handle webhook error event
  octokitApp.webhooks.onError((error) => {
    octokitApp.log.error(error, "An error occurred in a webhook handler");
  });

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

  boltApp.command(
    "/hello-github",
    async ({ command, ack, respond, logger }) => {
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
          const slackAppId = command.api_app_id;
          const subscriptions = {
            [slackAppId]: {
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
              slackAppId,
              slackChannelId: command.channel_id,
              githubInstallationId: installationId,
            },
            "Variable created in repository"
          );
        } else {
          // update the variable
          const subscriptions = JSON.parse(value);
          const slackAppId = command.api_app_id;
          subscriptions[slackAppId] = {
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
              slackAppId,
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
