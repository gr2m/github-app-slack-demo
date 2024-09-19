import pino from "pino";

// export for testing
export const healthLog = pino().child({ function: "health" });

/**
 * Netlify function for health check
 */
export default async function handler() {
  healthLog.info("Health check");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
