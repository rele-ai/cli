/**
 * debugError takes an list of
 * args as errors logs, and determine if they
 * should be displayed.
 *
 * @param {Array} args - args to display
 */
 module.exports.debugError = (...args) => {
  if (process.env.RELE_LOG_LEVEL === "debug") {
    console.error(...args)
  }
 }