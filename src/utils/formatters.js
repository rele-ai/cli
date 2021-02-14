/**
 * Flatten array
 *
 * @param {Array} arr - array to flatten
 */
module.exports.flatten = (arr) => {
  return arr.reduce((flat, toFlatten) => {
    return flat.concat(Array.isArray(toFlatten) ? this.flatten(toFlatten) : toFlatten)
  }, [])
}

// map conf keys
exports.CONF_KEYS_MAP = {
  apps: "system_key",
  app_actions: "operation_key",
  operations: "key",
  workflows: "key",
  translations: "key",
}