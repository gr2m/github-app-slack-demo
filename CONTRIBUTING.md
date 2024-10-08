# Contributing

Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) and follow the guidelines below.

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

### Generate a Netlify Personal Access Token

The token is needed to access the Netlify Blob Storage APi.

1. Open https://app.netlify.com/user/applications/personal
2. Generate a token without expiration
3. Set the token as the value for `NETLIFY_PERSONAL_ACCESS_TOKEN` in your `.env` file.

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
