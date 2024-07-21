/**
 *
 * @param {import('pino').Logger} logger
 * @returns string[][] - array of log messages
 */
export function mockLog(logger) {
  const logs = [];

  logger.info = (...args) => {
    logs.push(["info", ...args]);
  };
  logger.error = (...args) => {
    logs.push(["info", ...args]);
  };
  logger.warn = (...args) => {
    logs.push(["info", ...args]);
  };
  logger.debug = (...args) => {
    logs.push(["info", ...args]);
  };
  logger.fatal = (...args) => {
    logs.push(["info", ...args]);
  };
  logger.child = () => logger;

  return logs;
}
