const yaml = require("js-yaml")
const { toSnakeCase } = require("./index")

/**
* Configuration data from YAML.
*
* @param {object} conf - Configuration data.
* @returns {object} doc - Firestore doc representation.
*/
module.exports.confToDoc = (conf) => {
  switch(conf.type) {
    case "App":
      return loadAppDoc(conf)
    case "AppAction":
      return loadAppActionDoc(conf)
    case "Workflow":
      return loadWorkflowDoc(conf)
    case "Operation":
      return loadOperationDoc(conf)
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
module.exports.docToConf = (docType, doc, { apps, appActions, workflows } = {}) => {
  switch(docType) {
    case "app":
      return loadAppConf(doc)
    case "app_action":
      return loadAppActionConf(doc, apps)
    case "workflow":
      return loadWorkflowConf(doc)
    case "operation":
      return loadOperationConf(doc, apps, appActions, workflows)
    case "translation":
      return loadTranslationConf(doc)
    default:
      throw new Error(`unsupported document type: ${docType}`)
  }
}


/**
 * Load the app config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadAppConf = (doc) => {
  return yaml.dump({
    type: "App",
    base_url: doc.base_url,
    tls: doc.tls || false,
    display_name: doc.display_name,
    protocol: doc.protocol,
    request: doc.request,
    key: doc.system_key,
    is_global: doc.org === "global"
  })
}

/**
 * Load the app action config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} apps - Map of all the applications.
 * @returns {object} YAML config.
 */
const loadAppActionConf = (doc, apps) => {
  return yaml.dump({
    type: "AppAction",
    request: doc.request,
    display_name: doc.display_name,
    metadata: doc.metadata,
    key: doc.operation_key,
    selector: {
      app: apps[doc.app_id].system_key
    }
  })
}

/**
 * Load the workflow config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadWorkflowConf = (doc) => {
  return yaml.dump({
    type: "Workflow",
    display_name: doc.display_name,
    key: doc.key,
    match: {
      ...doc.match,
      input: (doc.match.input || "").indexOf(",") !== -1 ? doc.match.input.split(",") : doc.match.input
    }
  })
}

/**
 * Load the operation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} apps - Map of all applications.
 * @param {object} appActions - Map of all app actions.
 * @param {object} workflows - Map of all workflows.
 * @returns {object} YAML config.
 */
const loadOperationConf = (doc, apps, appActions, workflows) => {
  return yaml.dump({
    type: "Operation",
    selector: {
      workflow: doc.workflows.map((wid) => workflows[wid].key),
      app: apps[doc.app_id].system_key,
      app_action: appActions[doc.action.id].operation_key
    },
    next_operation: {
      selector: Object.entries((doc.next_operation || {})).map(([wid, oid]) => ({
        workflow: wid,
        operation: oid
      }))
    },
    on_error: {
      selector: Object.entries((doc.on_error || {})).map(([wid, oid]) => ({
        workflow: wid,
        operation: oid
      }))
    },
    payload: doc.payload,
    is_root: doc.is_root || false,
    input: doc.input,
    output: doc.output,
    redis: doc.redis,
    key: doc.key
  })
}

/**
 * Load the translation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadTranslationConf = (doc) => {
  return yaml.dump({
    type: "Translation",
    ...doc
  })
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadAppDoc = (conf) => {
  return {
    docType: toSnakeCase(conf.type),
    doc: {}
  }
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadAppActionDoc = (conf) => {
  return {
    docType: toSnakeCase(conf.type),
    doc: {}
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
  return {
    docType: toSnakeCase(conf.type),
    doc: {}
  }
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadOperationDoc = (conf) => {
  return {
    docType: toSnakeCase(conf.type),
    doc: {}
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
  return {
    docType: toSnakeCase(conf.type),
    doc: {}
  }
}
