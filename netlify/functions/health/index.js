import pino from "pino";

const log = pino();
const healthLog = log.child({ name: "health" });

/**
 * Netlify function for health check
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 */
export const handler = async (event, context) => {
  healthLog.info("Health check");

  return {
    body: JSON.stringify({ ok: true }),
    statusCode: 200,
  };
};
