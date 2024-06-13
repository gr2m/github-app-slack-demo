import bolt from '@slack/bolt';
import pino from 'pino';

const logger = pino();

// Initializes your app with your bot token and signing secret
const app = new bolt.App({
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

await app.start(process.env.SLACK_PORT)

logger.info('⚡️ Bolt app is running!');
