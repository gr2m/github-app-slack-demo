import bolt from '@slack/bolt';

// Initializes your app with your bot token and signing secret
const app = new bolt.App({
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

/**
 * @param {import("pino").Logger} log 
 */
export const startSlackApp=async( log )=>{
    await app.start(process.env.SLACK_PORT)
    log.info('⚡️ Bolt app is running!');
}

export default app


