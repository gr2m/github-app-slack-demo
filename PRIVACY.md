# Privacy Policy

Gregor Martynus ("Me", "Myself", and "I") built [github/github-app-slack-demo](https://github.com/gr2m/github-app-slack-demo) (the "app") as an Open Source GitHub App. This service is provided by myself and is intended for use as is.

This page is used to inform users ("you") regarding my policies with the collection, use, and disclosure of personal information if anyone decided to use this service.

If you choose to use the app, then you agree to the collection and use of information in relation to this policy. The collected information is required for the service to work. It is neither stored nor shared with 3rd parties.

## Information collection and use

The app utilizes a Slack app to interact with Slacks API and a GitHub app to interact with GitHub's API.

When installing the Slack app, you grant it access to the following scopes

1. [**chat:write**](https://api.slack.com/scopes/chat:write)

   When a user subscribes to a GitHub repository, the app is sending notifications for each new issue in channel where the subscription was created.

1. [**chat:write.public**](https://api.slack.com/scopes/chat:write.public)

   Improves user experience by not needing to explicitly add the app to a public channel before running the slash command to subscribe to a repository

1. [**commands**](https://api.slack.com/scopes/commands)

   The `/hello-github` command is used in order to subscribe to a GitHub repository.

The app is receiving every slash command that begins with `/hello-github` and logs it out.

When installing the the GitHub app you grant it

1. **Read access to [issues](https://developer.github.com/v3/apps/permissions/#issues)**

   The app receives webhook requests each time an issue is created in any of the repositories the GitHub app is installed in.

## Sharing of data with 3rd party services

The app is hosted on [Netlify](https://netlify.com). No other 3rd party service is used.

Netlify persists logs for up to 7 days. The logs do not include any personal information, except repository names (e.g. `gr2m/github-app-slack-demo`).

The app uses [Netlify Blobs](https://docs.netlify.com/blobs/overview/) to store

1. Slack app installations. That is required in order to [make a Slack App distributable](https://api.slack.com/distribution).
2. Notification subscription

No personal data is stored.

## Security

I value your trust in providing your personal information, thus I am striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and I cannot guarantee its absolute security.

## Changes to this privacy policy

I may update this privacy policy from time to time. Thus, you are advised to review this page periodically for any changes. I will notify you of any changes by creating a pull request on this repository and leaving it open for at least 14 days to give time for you to raise any concerns. These changes are effective immediately after they are merged into the main branch.

## Contact me

If you have any questions or suggestions about my Privacy Policy, do not hesitate to contact me at `github-app-slack-demo@martynus.net`.
