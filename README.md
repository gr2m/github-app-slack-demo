# github-app-slack-demo

A minimal GitHub App that integrates with Slack.

## Local Development

### Prerequisites

- Node.js v20+
- A GitHub account
- A Slack account

### Initial setup

```
npm install
```

### Tests

Run tests with

```
npm test
```

Open a detailed coverage report with

```
npm run coverage
```

### Register a GitHub App

Run the following command and follow the instructions

```
npm run scripts/register-github-app.js
```

### Register a Slack App

1. Open https://api.slack.com/apps
1. From the "Your App Configuration Tokens", copy the "Refresh Token" and set it as the value for `SLACK_REFRESH_TOKEN` in your `.env` file.
1. Click on "Create New App".
1. Select "From Manifest" as the creation method.
1. Choose the target workspace where you want to install the app for development.
1. Paste the contents of your `slack-manifest.yaml` file into the provided field. Replace the placeholders
1. Once created, copy the "Signing Secret". You will need this value as the value for `SLACK_SIGNING_SECRET` in your `.env` file.
1. Open the "OAuth & Permissions" page
1. Click on "Install to Workspace" and grant the requested permissions
1. Copy the "Bot User OAuth Token" and set it as the value for `SLACK_BOT_TOKEN` in your `.env` file.

### Verify Credentials

```
npm run verify
```

### Running the app

```
npm run dev
```

Test by by opening http://localhost:8000/api/health.

If you don't want your browser to open automatically, you can pass `--no-open`

```
npm run dev -- --no-open
```

#### Test with slack event subscription

- Start the dev server in webhooks mode: `npm run dev -- --live=$GITHUB_USER`. (Replace `$GITHUB_USER` with your GitHub username or any other string that you want to be part of a unique `*.netlify.live` URL)
- Open your app's Event Subscriptions settings page: `https://api.slack.com/apps/[app id]/event-subscriptions`
- Enter the copied URL in the "Request URL" field and append `/api/slack-events` to it, it should look like this: `https://[your --live value]--github-app-slack-demo/api/slack-events`. Once entered, Slack will verify the URL by sending a request, it should show up in the logs of your dev server.

## License

[MIT](LICENSE)
