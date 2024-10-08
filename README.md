# github-app-slack-demo

A Slack app that notifies you about new issues in GitHub repositories.

## About this app

This app is a minimal demo that showcases how to integrate GitHub with Slack using GitHub Apps and Slack Apps following best practices for implementation, testing, and deployment.

The functionality is kept intentionally simple: use the `/hello-github subscribe owner/repo` Slack command to subscribe to new issues for a GitHub repository.

You can try out the latest version of this app at https://github-app-slack-demo.netlify.app/.

## What others built

Did you extend or change the functionality and want to share it with others? Add a link to your repository below

- [Add your link here](#tbd)

## How it works

The server listens for incoming requests from Slack and GitHub. A GitHub App is used to grant access to repositories and receive events. A Slack App is used to receive commands and send messages to a channel.

A database is required even for the simplest Slack App if the app is meant to be [distributed](https://api.slack.com/distribution), meaning it can be installed in Slack workspaces outside the one it was registred in. The reason is that installing the Slack App is an OAuth flow at which end a workspace-specific bot token is created. In order to interact with that workspace in future, that token needs to be persisted. Slack's Bolt framework supports the concept of an [installationStore](https://tools.slack.dev/node-slack-sdk/reference/oauth/interfaces/InstallationStore/) to make the process of persisting and retrieving the bot tokens easier.

For the sake of simplicity, this app is using [Netlify Blobs](https://docs.netlify.com/blobs/overview/), as it is already using Netlify for deployments.

Notification subscriptions are also persisted in the database.

## Architecture

The core of the functionality lives in [main.js](main.js). It's a function that retrieves both the Slack and GitHub SDK clients and defines event and command handlers. It should be straight forward to find the right place when looking for the implementation of a certain functionality. As code grows, logic can be moved out, but for the scope of this app, a single file should suffice.

We use Netlify for deployment and the local dev server. It has a built in [local tunnel using the `--live` flag](https://docs.netlify.com/cli/local-development/#share-a-live-development-server) which lets us run the same code locally as we would in production. As part of the local dev server, we also execute [dev/server.js](dev/server.js) which verifies credentials and updates the webhook URLs for the configured GitHub and Slack apps to point to the `--live` URL of the local dev server.

GitHub Webhooks are received using a Netlify function at [netlify/functions/github-webhooks/index.js](netlify/functions/github-webhooks/index.js). Slack commands are received using a Netlify function at [netlify/functions/slack/index.js](netlify/functions/slack/index.js). This function also handles the OAuth install and callback. Both functions invoke the [main.js](main.js) function and inject the respective events after verifying the requests.

## Contributing

Any kind of contribution is much appreciated. Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Maintainers

[@gr2m](https://github.com/gr2m)

## License

[MIT](LICENSE)
