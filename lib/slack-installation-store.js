// @ts-check

import { getDeployStore } from "@netlify/blobs";

export async function getInstallationStore() {
  const database = getDeployStore("slack-installations");
  return {
    storeInstallation: async (installation) => {
      if (installation.team !== undefined) {
        return await database.setJSON(installation.team.id, installation);
      }
      throw new Error("Failed to save installation data to installationStore");
    },
    fetchInstallation: async (installQuery) => {
      if (installQuery.teamId !== undefined) {
        return await database.get(installQuery.teamId);
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
