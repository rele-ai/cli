const glob = require("glob")
const findPkg = require("pkg-dir")

/**
 * Assign value to nested path.
 *
 * @param {object} obj - Root object.
 * @param {Array.<string>} keyPath - Nested path.
 * @param {*} value - End value on nested path.
 */
const _assign = (obj, keyPath, value) => {
  lastKeyIndex = keyPath.length-1;
  for (var i = 0; i < lastKeyIndex; ++ i) {
    key = keyPath[i];
    if (!(key in obj)){
      obj[key] = {}
    }
    obj = obj[key];
  }
  obj[keyPath[lastKeyIndex]] = value;
}

/**
 * Generates API for each command by
 * command groups.
 */
const generatePluginApi = () => {
  // load all files from rele.ai CLI commands
  const files = glob.sync(`${findPkg.sync()}/node_modules/@releai/cli/src/commands/**/*.js`)

  // groups and build API
  let api = {}

  // recursivly generate API
  for (const file of files) {
    // get sub command path
    const structure = file.split("@releai/cli/src/commands/")[1].replace(/\.js/g, "").replace(/-/g, "_").split(/\//g)

    // create nested field
    _assign(
      api,
      structure,
      {
        // list of command callbacks
        _callbacks: [],

        // executions function
        _execute(...args) {
          return this._callbacks.map((cb) => cb(...args))
        },

        // callback event handler setter
        on(cb) {
          this._callbacks.push(cb)
        }
      }
    )
  }

  // return generated api
  return api
}

/**
 * Export the declare helper
 */
module.exports = (plugin) => () => {
  // generate plugin API
  const api = generatePluginApi()

  // run the plugin
  plugin(api)

  // return api
  return api
}
