const glob = require("glob")
const childProcess = require("child_process")

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
  // global root
  const npmRoot = childProcess.execSync("npm root -g").toString().trim()

  // load all files from rele.ai CLI commands
  const files = glob.sync(`${npmRoot}/@releai/cli/src/commands/**/*.js`)

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
        _callbacks: {},

        // executions function
        async _execute(event, ...args) {
          // check even callbacks before execute
          if (this._callbacks[event] && this._callbacks[event].length) {
            return await Promise.all(this._callbacks[event].map((cb) => cb(...args)))
          }

          // return empty callbacks if no even was found
          return []
        },

        // callback event handler setter
        on(event, cb) {
          // create callback section
          if (!this._callbacks[event]) {
            this._callbacks[event] = []
          }

          // push to event
          this._callbacks[event].push(cb)
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
