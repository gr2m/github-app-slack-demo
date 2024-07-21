import pino from "pino";

// export for testing
export const healthLog = pino().child({ name: "health" });

/**
 * Netlify function for health check
 */
export async function handler() {
  healthLog.info("Health check");

  return {
    body: JSON.stringify({ ok: true }),
    statusCode: 200,
  };
}
