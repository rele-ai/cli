const os = require("os")
const fs = require("fs")
const findPkg = require("pkg-dir")

// global constansts
const PKG_DIR = findPkg.sync()
const RB_DIR = `${os.homedir()}/.rb`
const CONFIG_DIR = `${RB_DIR}/configs`

/**
 * Load all the plugins data from the config files
 */
const _loadPluginsList = () => {
  // collect plugins
  let plugins = []
  let shouldLoadGlobalRbc = true

  // if .rbc.js exists load local plugins and check settings
  if (fs.existsSync(`${PKG_DIR}/.rbc.js`)) {
    // load local rbc.js
    const localRbc = require(`${PKG_DIR}/.rbc.js`)

    // update plugins
    if (localRbc.plugins && localRbc.plugins.length) {
      plugins = plugins.concat(localRbc.plugins)
    }

    // check global rbc settings
    if (localRbc.useGlobalConfigs === false) {
      shouldLoadGlobalRbc = false
    }
  }

  // load global configs when needed
  if (shouldLoadGlobalRbc && fs.existsSync(`${CONFIG_DIR}/.rbc.js`)) {
    // require global configs
    const globalRbc = require(`${CONFIG_DIR}/.rbc.js`)

    // update plugins
    if (globalRbc.plugins && globalRbc.plugins.length) {
      plugins = plugins.concat(globalRbc.plugins)
    }
  }

  // return loaded plugins
  return plugins
}

/**
 * Load all plugins.
 */
const loadPlugins = () => {
  // load api
  let api = {}

  // collect plugins data from configs
  // load all plugins as callbacks
  _loadPluginsList().forEach((plugin) => {
    // check if string or function
    if (typeof plugin === "string") {
      api = require(plugin)()
    } else if (typeof plugin === "function") {
      api = plugin()
    } else {
      throw new Error("unsupported plugin type")
    }
  })

  return api
}

/**
 * Export plugins api
 */
module.exports = loadPlugins()
