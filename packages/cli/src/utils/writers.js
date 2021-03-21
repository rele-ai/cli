const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

/**
 * Parse and write the YAML config file.
 *
 * @param {object} object - Object to parse
 * @param {string} output - output to config file.
 * @returns {object} - Config file data.
 */
module.exports.writeConfig = (object, output) => {
  // parse output path
  const parsed = path.parse(output)

  // check output ext
  if ([".yaml", ".yml"].includes(parsed.ext)) {
    // check if dir path exists
    if (parsed.dir && !fs.existsSync(parsed.dir)) {
      fs.mkdirSync(parsed.dir, { recursive: true })
    }

    // write file
    if (object && object.constructor === Object) {
      object = yaml.dump(object)
    }
    fs.writeFileSync(output, object)
  } else {
    // handle error
    throw new Error("provided output path must be of a YAML file.")
  }
}