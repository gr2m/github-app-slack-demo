// @ts-check

import { getStore } from "@netlify/blobs";

/* c8 ignore start */
// TODO: add unit test for store

/**
 * @param {object} options
 * @param {string} options.siteID
 * @param {string} options.token
 * @returns {import("@slack/oauth").InstallationStore}
 */
export function getInstallationStore({ siteID, token }) {
  const database = getStore({
    name: "slack-installations",
    siteID,
    token,
  });

  return {
    storeInstallation: async (installation) => {
      if (installation.team !== undefined) {
        return await database.setJSON(installation.team.id, installation);
      }
      throw new Error("Failed to save installation data to installationStore");
    },
    fetchInstallation: async (installQuery) => {
      if (installQuery.teamId !== undefined) {
        return JSON.parse(await database.get(installQuery.teamId));
      }
      throw new Error("Failed to fetch installation");
    },
    deleteInstallation: async (installQuery) => {
      if (installQuery.teamId !== undefined) {
        return await database.delete(installQuery.teamId);
      }
      throw new Error("Failed to delete installation");
    },
  };
}
