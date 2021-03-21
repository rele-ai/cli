const fs = require("fs")
const yaml = require("js-yaml")

/**
 * Read and parse the YAML config file.
 *
 * @param {string} path - Path to config file.
 * @returns {object} - Config file data.
 */
module.exports.readConfig = (path) => {
  // define files list
  let files = []

  // check if path exists
  if (fs.existsSync(path)) {
    // pull path stats
    const stats = fs.lstatSync(path)

    // check stats source
    if (stats.isDirectory()) {
      // get files name in folder
      const filenames = fs.readdirSync(path).filter(fileName => fileName.endsWith(".yaml"))

      // remove back-slash if exists
      const formattedPath = path.endsWith("/") ? path.slice(0, -1) : path

      // add files to list
      filenames.forEach(file => {
        files.push(fs.readFileSync(`${formattedPath}/${file}`, "utf-8"))
      })

    } else if (stats.isFile()) {
      // read the file
      files.push(fs.readFileSync(path, "utf-8"))
    } else {
      throw new Error("unknown path given.")
    }
  } else {
    throw new Error("path is not exists.")
  }

  // file to upload
  const mergedFile = files.join("\n---\n")

  // parse yaml to object and return to user
  return yaml.loadAll(mergedFile)
}