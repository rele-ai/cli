const fs = require("fs")
const glob = require("glob")
const yaml = require("js-yaml")
const pkgDir = require("pkg-dir")
const versionSort = require("../../lib/utils/version-sort")
const { loadConfNextOperations, loadDocNextOperations } = require("./index")

/**
* Configuration data from YAML.
*
* @param {string} confType - The config type.
* @param {object} config - YAML document structure.
* @param {object} options - additional params.
* @returns {object} doc - Firestore doc representation.
*/
module.exports.confToDoc = (confType, conf, { apps, appActions, workflows, versions, user } = {}) => {
  switch(confType) {
    case "App":
      return loadAppDoc(conf)
    case "AppAction":
      return loadAppActionDoc(conf, apps)
    case "Workflow":
      return loadWorkflowDoc(conf)
    case "Operation":
      return loadOperationDoc(conf, apps, appActions, workflows, versions, user)
    case "Translation":
      return loadTranslationDoc(conf)
    default:
      throw new Error(`unsupported config type: ${conf.type}`)
  }
}

/**
* Converts firestore document to YAML
* config file.
*
* @param {string} docType - The document type.
* @param {object} doc - Firestore document structure.
* @param {object} options - additional params.
* @returns {object} conf - YAML config
*/
module.exports.docToConf = (docType, doc, { apps, appActions, workflows, operations, versions, shouldDump } = {}) => {
  switch(docType) {
    case "app":
      return loadAppConf(doc, versions, shouldDump)
    case "app_action":
      return loadAppActionConf(doc, apps, versions, shouldDump)
    case "workflow":
      return loadWorkflowConf(doc, versions, shouldDump)
    case "operation":
      return loadOperationConf(doc, apps, appActions, workflows, operations, versions, shouldDump)
    case "translation":
      return loadTranslationConf(doc, versions, shouldDump)
    default:
      throw new Error(`unsupported document type: ${docType}`)
  }
}


/**
 * Load the app config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} versions - Map of all versions
 * @returns {object} YAML config.
 */
const loadAppConf = (doc, versions, shouldDump=true) => {
  const data = {
    type: "App",
    base_url: doc.base_url,
    tls: doc.tls || false,
    display_name: doc.display_name,
    protocol: doc.protocol,
    version: (versions[doc.version] || {}).key,
    request: doc.request,
    key: doc.system_key
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the app action config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} apps - Map of all the applications.
 * @param {object} versions - Map of all versions
 * @returns {object} YAML config.
 */
const loadAppActionConf = (doc, apps, versions, shouldDump=true) => {
  const data = {
    type: "AppAction",
    request: doc.request,
    display_name: doc.display_name,
    version: (versions[doc.version] || {}).key,
    metadata: doc.metadata,
    key: doc.operation_key,
    selector: {
      app: apps[doc.app_id].system_key
    }
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the workflow config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} versions - Map of all versions
 * @returns {object} YAML config.
 */
const loadWorkflowConf = (doc, versions, shouldDump=true) => {
  const data = {
    type: "Workflow",
    display_name: doc.display_name,
    key: doc.key,
    version: (versions[doc.version] || {}).key,
    match: {
      ...doc.match,
      input: (doc.match.input || "").indexOf(",") !== -1 ? doc.match.input.split(",") : doc.match.input
    }
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the operation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} apps - Map of all applications.
 * @param {object} appActions - Map of all app actions.
 * @param {object} workflows - Map of all workflows.
 * @param {object} operations - Map of all operations.
 * @param {object} versions - Map of all versions
 * @returns {object} YAML config.
 */
const loadOperationConf = (doc, apps, appActions, workflows, operations, versions, shouldDump=true) => {
  const data = {
    type: "Operation",
    selector: {
      workflow: doc.workflows.map((wid) => workflows[wid].key),
      app: apps[doc.app_id].system_key,
      app_action: appActions[doc.action.id].operation_key
    },
    next_operation: doc.next_operation || {},
    on_error: doc.on_error || {},
    payload: doc.payload,
    is_root: doc.is_root || false,
    input: doc.input,
    output: doc.output,
    redis: doc.redis,
    version: (versions[doc.version] || {}).key,
    key: doc.key
  }

  // attach next operations and on error
  loadConfNextOperations(data, workflows, operations)

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the translation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} versions - Map of all versions
 * @returns {object} YAML config.
 */
const loadTranslationConf = (doc, versions, shouldDump=true) => {
  const data = {
    type: "Translation",
    key: doc.key,
    lang: doc.lang,
    value: doc.value,
    version: (versions[doc.version] || {}).key,
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadAppDoc = (conf) => {
  try {
    // deep config copy
    let cpApp = { ...conf }

    // delete unessesary keys
    delete cpApp.type
    delete cpApp.key

    // attach system key
    cpApp.system_key = conf.key

    if (!Object.keys((cpApp.request || {})).length) {
      cpApp.request = {}
    }

    // attach body headers and query
    if (!Object.keys((cpApp.request || {}).headers || {}).length) {
      cpApp.request.headers = {}
    }

    // attach body headers and query
    if (!Object.keys((cpApp.request || {}).body || {}).length) {
      cpApp.request.body = {}
    }

    // attach body headers and query
    if (!Object.keys((cpApp.request || {}).query || {}).length) {
      cpApp.request.query = {}
    }

    // return formatted app
    return cpApp
  } catch (e) {
    throw new Error("unable to parse App configuration to document format. Please make sure you have provided all the attributes correctly. For more information visit: https://docs.rele.ai/guide/apps.html")
  }
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @param {object} apps - Map of all the applications.
 * @returns {object} - Firestore document.
 */
const loadAppActionDoc = (conf, apps) => {
  try {
    // deep config copy
    let cpAppAction = { ...conf }

    // delete unessesary keys
    delete cpAppAction.type
    delete cpAppAction.selector
    delete cpAppAction.key

    // attach operation type
    cpAppAction.operation_key = conf.key

    if (!Object.keys((cpAppAction.request || {})).length) {
      cpAppAction.request = {}
    }

    // attach body headers and query
    if (!Object.keys((cpAppAction.request || {}).headers || {}).length) {
      cpAppAction.request.headers = {}
    }

    // attach body headers and query
    if (!Object.keys((cpAppAction.request || {}).body || {}).length) {
      cpAppAction.request.body = {}
    }

    // attach body headers and query
    if (!Object.keys((cpAppAction.request || {}).query || {}).length) {
      cpAppAction.request.query = {}
    }

    // find app id related to app action
    const relatedAppId = Object.keys(apps).find(key => {
      return apps[key].system_key === (conf.selector || {}).app
    })

    if (relatedAppId) {
      // attach app id
      cpAppAction.app_id = relatedAppId
    } else {
      throw new Error(`unable to find related app with system key = ${(conf.selector || {}).app}`)
    }

    // return formatted app action
    return cpAppAction
  } catch (e) {
    throw new Error(e.message || "unable to parse App Action configuration to document format. Please make sure you have provided all the attributes correctly. For more information visit: https://docs.rele.ai/guide/app-actions.html")
  }
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadWorkflowDoc = (conf) => {
  try {
    // return workfllow doc object
    return {
      display_name: conf.display_name || {},
      key: conf.key,
      match: {
        ...conf.match,
        payload: conf.match.callback !== "match_any" ? "message_data.message.body" : ""
      }
    }
  } catch (e) {
    throw new Error("unable to parse Workflow configuration to document format. Please make sure you have provided all the attributes correctly. For more information visit: https://docs.rele.ai/guide/workflows.html")
  }
}

// get version id
const _getVersionId = (versions, key, isReleAi) => {
  const filter = isReleAi
    ? (version) => version.key === key && version.org === "global"
    : (version) => version.key === key && version.org !== "global"

  return Object.values(versions).find(filter)
}

const _mapAppVersions = (apps, versions) => {
  const _map = {}

  Object.values(apps).forEach((app) => {
    if (!_map[app.system_key]) {
      _map[app.system_key] = []
    }

    _map[app.system_key].push(versions[app.version])
  })

  return _map
}

const _getAppId = (conf, apps, versions, user) => {
  // get app details
  let versionId = null
  const isReleAi = user.emails[0].endsWith("@rele.ai")
  const [appKey, appVersion] = conf.selector.app.split(":")

  // check if version is provided
  if (appVersion) {
    versionId = _getVersionId(versions, appVersion, isReleAi)
  } else {
    // check if the application is within the scope
    const scopeAppKeys = glob.sync(
      "**/*.y?(a)ml",
      {
        ignore: ["**/node_modules/**", "**/vendor/**"],
        absolute: true
      })
      .map((location) => {
        // load file
        const fileData = fs.readFileSync(location, "utf-8")

        // load yamls
        const yamls = yaml.loadAll(fileData)

        if (yamls && yamls.length) {
          return yamls.map((conf) => {
            if (conf.type === "App" && conf.key) {
              return conf.key
            }
          })
        }
      })
      .flat()
      .filter((key) => !!key)

    if (scopeAppKeys.includes(appKey)) {
      // get from flag or from pkg.version
      const flagIndex = process.argv.find((value) => value === "-v" || value === "--version")
      versionId = _getVersionId(versions, process.argv[flagIndex + 1] || require(`${pkgDir.sync(process.cwd())}/package.json`).version, isReleAi)
    }
  }

  // search for app id
  const mapAppVersions = _mapAppVersions(apps, versions)
  // const filter = isReleAi
  //   ? (version) => version.org === "global"
  //   : (version) => version.org !== "global"

  let shouldKeepSearch = !Boolean(versionId)
  return Object.values(apps).find(app => {
    if (shouldKeepSearch) {
      // get app latest version
      versionId = versionSort(mapAppVersions[app.system_key], { nested: "key" }).slice(-1)[0] || {}
    }

    return app.system_key === appKey && app.version === (versionId || {}).id
  }).id
}

/**
 * _getWorkflowId return the relevant
 * workflow id
 *
 * @param {obejct} conf
 * @param {object} workflows
 * @param {object} user
 * @returns
 */
 const _getWorkflowId = (conf, workflows, user) => {
  // determine if user is rele.ai user
  const isRele = user.emails[0].endsWith("@rele.ai")

  // pull all user workflows
  const userWorkflows = Object.values(workflows).filter((workflow) => {
    if (isRele) {
      return workflow.org === "global" && conf.selector.workflow.includes(workflow.key)
    } else {
      return workflow.org === user.orgs[0] && conf.selector.workflow.includes(workflow.key)
    }
  })

  // check if found any workflows
  if (!userWorkflows.length) {
    throw new Error("unable to find any matching workflows.")
  }

  // return user workflows
  return userWorkflows.map(workflow => workflow.id)
 }

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @param {object} apps - Map of all applications.
 * @param {object} appActions - Map of all app actions.
 * @param {object} workflows - Map of all workflows.
 * @returns {object} - Firestore document.
 */
const loadOperationDoc = (conf, apps, appActions, workflows, versions, user) => {
  try {
    // define base json operation
    const baseOperation = {
      is_root: conf.is_root,
      // workflows: Object.keys(workflows).filter(
      //   workflowId => conf.selector.workflow.includes(workflows[workflowId].key)
      // ),
      workflows: _getWorkflowId(conf, workflows, user),
      app_id: _getAppId(conf, apps, versions, user),
      payload: conf.payload || {},
      action: {
        id: Object.keys(appActions).find(key =>
          appActions[key].operation_key === conf.selector.app_action
        ),
        type: "app_action"
      },
      redis: {},
      input: conf.input || {},
      output: conf.output || {},
      next_operation: conf.next_operation || {},
      on_error: conf.on_error || {},
      key: conf.key
    }

    // attach redis field
    if ((conf.redis || {}).field) {
      baseOperation.redis.field = conf.redis.field
    } else {
      baseOperation.redis.field = conf.key
    }

    // attach redis type
    if ((conf.redis || {}).type) {
      baseOperation.redis.type = conf.redis.type
    } else {
      baseOperation.redis.type = "hash_map"
    }

    // load doc next operations
    loadDocNextOperations(baseOperation, workflows)

    // error handling
    if (!baseOperation.app_id) {
      throw new Error(`unable to find related app with system key = ${conf.selector.app}`)
    }

    if (!baseOperation.action.id) {
      throw new Error(`unable to find related app action with operation key = ${conf.selector.app_action}`)
    }

    // return formatted operation
    return baseOperation
  } catch (e) {
    throw new Error(e.message || "unable to parse Operation configuration to document format. Please make sure you have provided all the attributes correctly. For more information visit: https://docs.rele.ai/guide/workflows.html")
  }
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadTranslationDoc = (conf) => {
  try {
    // deep config copy
    let coTrns = { ...conf }

    // delete unessesary keys
    delete coTrns.type

    return coTrns
  } catch (e) {
    throw new Error("unable to parse Translation configuration to document format. Please make sure you have provided all the attributes correctly. For more information visit: https://docs.rele.ai/guide/translations.html")
  }
}
