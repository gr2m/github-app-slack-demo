# github-app-slack-demo

A minimal GitHub App that integrates with Slack

## The Plan

- [x] Create a "Hello, world" GitHub App that runs locally. It should comment on all new issues that have been created.
- [ ] Deploy the app to Netlify.
- [ ] Add a Slack integration that responds to messages with a "Hello, world" reply.
- [ ] Add a slash command creates a bi-directional sync between a slack channel and a github repository. When an issue is posted, create a message in the slack channel. When a message is posted in the slack channel, create an issue in the github repository. Use Supabase for data persistence.
- [ ] Prompt the user to authenticate when creating a bi-directional sync, and user their authentication to create issues.

## Local Development

### Initial setup

Register your GitHub App and set credentials in `.env`

```
npm install
npm run scripts/register-github-app.js
# Follow the instructions, make sure to install the app on your account at the end
```

### Running the app

```
npm run dev
```

Open a repository that belongs to your user account and create an issue. The app should comment on the issue.

## Licenes

[MIT](LICENSE)

## Configuring Slack for Local Development (markdown)

This guide details the steps to configure a Slack app for local development using a manifest file.

### Creating a Slack App with a Manifest

1. **Navigate to the Slack API Apps page:** [https://api.slack.com/quickstart](https://api.slack.com/quickstart)
2. **Click on "Create an App".**
3. **Select "From Manifest" as the creation method.**
4. **Choose the target workspace** where you want to install the app for development.
5. **Paste the contents of your `slack-manifest.yaml` file** into the provided field.
6. **Review the requested permissions and click "Next" to proceed.**
7. **Once created, copy the "Signing Secret".** You will need this value as the `SLACK_SIGNING_SECRET` environment variable for your application.

### Generating a Bot User OAuth Token

1. **Within the Slack App configuration page, navigate to the "OAuth & Permissions" section.**
2. **Click on "Install App to Workspace" and grant the necessary permissions.**
3. **Copy the "Bot User OAuth Token".** This value should be stored as the `SLACK_BOT_TOKEN` environment variable for your application.

This setup provides the necessary credentials to interact with the Slack API during local development using your custom manifest file. 
