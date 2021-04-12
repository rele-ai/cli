const fs = require("fs")
const path = require("path")
const glob = require("glob")
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

/**
 * Load all RELE.AI configs from a given main
 * project root directory.
 *
 * @param {string} projectRootDir - Project root directory.
 * @param {Array.<string|Buffer>} - Loaded files.
 */
module.exports.readAllConfigs = (projectRootDir) => {
  // resolve configs path
  const rootDir = path.resolve(__dirname, projectRootDir)

  // load all yaml files from project root
  const filePromises = glob.sync(`${rootDir}/**/*.yaml`).map((filepath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, "utf8", (err, data) => {
        err ? reject(err) : resolve(data)
      })
    })
  })

  // return promise wait for files
  return Promise.all(filePromises)
}
