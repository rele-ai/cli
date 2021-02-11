const yaml = require("js-yaml")

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
module.exports.docToConf = (docType, doc, { apps }) => {
  switch(docType) {
    case "app":
      return loadAppConf(doc)
    case "app_action":
      return loadAppActionConf(doc, apps)
    case "workflow":
      return loadWorkflowConf(doc)
    case "operation":
      return loadOperationConf(doc)
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
const loadWorkflowConf = (doc) => {}

/**
 * Load the operation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadOperationConf = (doc) => {}

/**
 * Load the translation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadTranslationConf = (doc) => {}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadAppDoc = (conf) => {
  return {
    docType: "",
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
    docType: "",
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
    docType: "",
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
    docType: "",
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
    docType: "",
    doc: {}
  }
}
