# github-app-slack-demo

A minimal GitHub App that integrates with Slack

## The Plan

- [x] Create a "Hello, world" GitHub App that runs locally. It should comment on all new issues that have been created.
- [x] Deploy the app to Netlify.
- [x] Add a Slack integration that responds to `app_home_opened` events.
- [ ] Add a slash command creates a bi-directional sync between a slack channel and a github repository. When an issue is posted, create a message in the slack channel. When a message is posted in the slack channel, create an issue in the github repository. Use Supabase for data persistence.
- [ ] Prompt the user to authenticate when creating a bi-directional sync, and user their authentication to create issues.

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
1. Click on "Create New App".
1. Select "From Manifest" as the creation method.
1. Choose the target workspace where you want to install the app for development.
1. Paste the contents of your `slack-manifest.yaml` file into the provided field. Replace the placeholders
1. Once created, copy the "Signing Secret". You will need this value as the value for `SLACK_SIGNING_SECRET` in your `.env` file.
1. In the "App-Level Tokens" below, click "Generate Token and Scopes". Set "Token Name" to "Development", add the "connections:write" scope, and click "Generate". Copy the token and set it as the value for `SLACK_APP_TOKEN` in your `.env` file.
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

## License

[MIT](LICENSE)
