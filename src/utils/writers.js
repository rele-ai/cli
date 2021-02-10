const fs = require("fs")
const yaml = require("js-yaml")

/**
 * Parse and write the YAML config file.
 *
 * @param {object} object - Object to parse
 * @param {string} output - output to config file.
 * @returns {object} - Config file data.
 */
module.exports.writeConfig = (object, output) => {
  fs.writeFileSync(output, yaml.safeDump(object))
}