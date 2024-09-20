// @ts-check

import { getStore } from "@netlify/blobs";

/* c8 ignore start */
// TODO: add unit test for store

/**
 * @param {object} options
 * @param {string} options.siteID
 * @param {string} options.token
 */
export function getSubscriptionsStore({ siteID, token }) {
  const store = getStore({
    name: "repository-subscriptions",
    siteID,
    token,
  });

  return {
    /**
     * @param {object} keyOptions
     * @param {string} keyOptions.owner
     * @param {string} keyOptions.repo
     * @param {string} keyOptions.slackAppId
     * @param {number} keyOptions.githubInstallationId
     * @returns {Promise<string[]>}
     */
    async getSubscriptionKeysForRepository(keyOptions) {
      const prefix = toKey(keyOptions);
      const { blobs } = await store.list({ prefix });
      return blobs.map((blob) => blob.key);
    },

    /**
     * @param {object} keyOptions
     * @param {string} keyOptions.owner
     * @param {string} keyOptions.repo
     * @param {string} keyOptions.slackAppId
     * @param {number} keyOptions.githubInstallationId
     * @param {string} keyOptions.teamId
     * @param {string} keyOptions.channelId
     * @returns {Promise<{ slackEnterpriseId: boolean } | null>}
     */
    async get(keyOptions) {
      const key = toKey(keyOptions);
      console.log({ key });
      const blob = await store.get(key);
      if (!blob) return null;

      return JSON.parse(blob);
    },

    /**
     * @param {object} keyOptions
     * @param {string} keyOptions.owner
     * @param {string} keyOptions.repo
     * @param {string} keyOptions.slackAppId
     * @param {number} keyOptions.githubInstallationId
     * @param {string} keyOptions.teamId
     * @param {string} keyOptions.channelId
     * @param {object} subscription
     * @param {boolean} subscription.slackEnterpriseId
     * @returns {Promise<void>}
     */
    async set(keyOptions, subscription) {
      await store.setJSON(toKey(keyOptions), subscription);
    },

    /**
     * @param {object} keyOptions
     * @param {string} keyOptions.owner
     * @param {string} keyOptions.repo
     * @param {string} keyOptions.slackAppId
     * @param {number} keyOptions.githubInstallationId
     * @param {string} keyOptions.teamId
     * @param {string} keyOptions.channelId
     * @returns {Promise<void>}
     */
    async delete(keyOptions) {
      await store.delete(toKey(keyOptions));
    },
  };
}

/**
 * @param {object} keyOptions
 * @param {string} keyOptions.owner
 * @param {string} keyOptions.repo
 * @param {string} keyOptions.slackAppId
 * @param {number} keyOptions.githubInstallationId
 * @param {string} [keyOptions.teamId]
 * @param {string} [keyOptions.channelId]
 * @returns {string}
 */
function toKey({
  owner,
  repo,
  slackAppId,
  githubInstallationId,
  teamId,
  channelId,
}) {
  const prefix = `${owner}/${repo}/${slackAppId}/${githubInstallationId}/`;
  if (!teamId || !channelId) return prefix;

  return `${prefix}${teamId}/${channelId}`;
}
