
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
* @returns {object} conf - YAML config
*/
module.exports.docToConf = (docType, doc) => {
  switch(docType) {
    case "app":
      return loadAppConf(doc)
    case "app_action":
      return loadAppActionConf(doc)
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

}

/**
 * Load the app action config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadAppActionConf = (doc) => {}

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
