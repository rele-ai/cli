const fs = require("fs")
const yaml = require("js-yaml")

/**
 * Read and parse the YAML config file.
 *
 * @param {string} path - Path to config file.
 * @returns {object} - Config file data.
 */
module.exports.readConfig = (path) => {
  // read the file
  const file = fs.readFileSync(path, "utf-8")

  // parse yaml to object and return to user
  return yaml.safeLoadAll(file)
}