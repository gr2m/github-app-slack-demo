# github-app-slack-demo

A minimal demo app that integrates GitHub with Slack.

## About this app

This app is a minimal demo that showcases how to integrate GitHub with Slack using GitHub Apps and Slack Apps following best practices for implementation, testing, and deployment.

The functionality is kept intentionally simple: use the `/hello-github subscribe owner/repo` Slack command to subscribe to new issues for a GitHub repository.

## What others built

Did you extend or change the functionality and want to share it with others? Add a link to your repository below

- [Add your link here](#tbd)

## How it works

The server listens for incoming requests from Slack and GitHub. A GitHub App is used to grant access to repositories and receive events. A Slack App is used to receive commands and send messages to a channel.

For simplicity, this application is not using a database. Subscriptions are stored using [GitHub Repository Variables](https://docs.github.com/en/actions/learn-github-actions/variables). When subscribed to a repository, the user is first asked to install the configured GitHub App. Once installed, the subscription is saved using the Slack APP ID, Slack channel ID and GitHub Installation ID as a JSON string as a `HELLO_SLACK_SUBSCRIPTIONS` repository variable. When a webhook is received, `HELLO_SLACK_SUBSCRIPTIONS` is looked up for the current repository. If there are valid subscriptions, messages are sent to the respective slack channels.

## Architecture

The core of the functionality lives in [main.js](main.js). It's a function that retrieves both the Slack and GitHub SDK clients and defines event and command handlers. It should be straight forward find the right place when looking for the implementation of a certain functionality. As code grows, logic can be moved out, but for the scope of this app, a single file should suffice.

We use Netlify for deployment and the local dev server. It has a built in [local tunnel using the `--live` flag](https://docs.netlify.com/cli/local-development/#share-a-live-development-server) which lets us run the same code locally as we would in production. As part of the local dev server, we also execute [dev/server.js](dev/server.js) which verifies credentials and updates the webhook URLs for the configured GitHub and Slack apps to point to the `--live` URL of the local dev server.

GitHub Webhooks are received using a Netlify function at [netlify/functions/github-webhooks/index.js](netlify/functions/github-webhooks/index.js). Slack commands are received using a Netlify function at [netlify/functions/slack-events/index.js](netlify/functions/slack-events/index.js). Both functions invoke the [main.js](main.js) function and inject the respective events after verifying the requests.

## Contributing

Any kind of contribution is much appreciated. Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Maintainers

[@gr2m](https://github.com/gr2m)

## License

[MIT](LICENSE)
