/**
 * This function is our "GitHub App". It's where we register our event and error handlers.
 *
 * @param {import("octokit").App} app
 */
export default async function githubApp(app) {
  app.webhooks.on("issues.opened", async ({ id, name, payload, octokit }) => {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const issueNumber = payload.issue.number;

    app.log.info(
      { url: payload.issue.html_url, title: payload.issue.title },
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

    app.log.info({ url: comment.html_url }, "Added a comment to an issue");
  });

  // handle webhook error event
  app.webhooks.onError((error) => {
    app.log.error(error, "An error occurred in a webhook handler");
    throw error;
  });
}
