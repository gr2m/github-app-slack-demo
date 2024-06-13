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
