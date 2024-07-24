// @ts-check

/**
 * @param {import("@slack/bolt").App} app
 * @param {import("pino").Logger} log
 */
export default async function slackApp(app, log) {
  app.event("app_home_opened", async ({ event, client, context }) => {
    const eventLog = log.child({
      userId: context.userId,
      teamId: context.teamId,
      enterpriseId: context.enterpriseId,
      isEnterpriseInstall: context.isEnterpriseInstall,
    });
    eventLog.info("app_home_opened event received");

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
}
