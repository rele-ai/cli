const yaml = require("js-yaml")
const { toSnakeCase } = require("./index")

/**
* Configuration data from YAML.
*
* @param {string} confType - The config type.
* @param {object} config - YAML document structure.
* @param {object} options - additional params.
* @returns {object} doc - Firestore doc representation.
*/
module.exports.confToDoc = (confType, conf, { apps, appActions, workflows } = {}) => {
  switch(confType) {
    case "App":
      return loadAppDoc(conf)
    case "AppAction":
      return loadAppActionDoc(conf, apps)
    case "Workflow":
      return loadWorkflowDoc(conf)
    case "Operation":
      return loadOperationDoc(conf, apps, appActions, workflows)
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
module.exports.docToConf = (docType, doc, { apps, appActions, workflows, operations, shouldDump } = {}) => {
  switch(docType) {
    case "app":
      return loadAppConf(doc, shouldDump)
    case "app_action":
      return loadAppActionConf(doc, apps, shouldDump)
    case "workflow":
      return loadWorkflowConf(doc, shouldDump)
    case "operation":
      return loadOperationConf(doc, apps, appActions, workflows, operations, shouldDump)
    case "translation":
      return loadTranslationConf(doc, shouldDump)
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
const loadAppConf = (doc, shouldDump=true) => {
  const data = {
    type: "App",
    base_url: doc.base_url,
    tls: doc.tls || false,
    display_name: doc.display_name,
    protocol: doc.protocol,
    request: doc.request,
    key: doc.system_key,
    is_global: doc.org === "global"
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the app action config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @param {object} apps - Map of all the applications.
 * @returns {object} YAML config.
 */
const loadAppActionConf = (doc, apps, shouldDump=true) => {
  const data = {
    type: "AppAction",
    request: doc.request,
    display_name: doc.display_name,
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
 * @returns {object} YAML config.
 */
const loadWorkflowConf = (doc, shouldDump=true) => {
  const data = {
    type: "Workflow",
    display_name: doc.display_name,
    key: doc.key,
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
 * @returns {object} YAML config.
 */
const loadOperationConf = (doc, apps, appActions, workflows, operations, shouldDump=true) => {
  const data = {
    type: "Operation",
    selector: {
      workflow: doc.workflows.map((wid) => workflows[wid].key),
      app: apps[doc.app_id].system_key,
      app_action: appActions[doc.action.id].operation_key
    },
    next_operation: {
      selector: Object.entries((doc.next_operation || {})).map(([wid, oid]) => ({
        workflow: workflows[wid].key,
        operation: operations[oid].key
      }))
    },
    on_error: {
      selector: Object.entries((doc.on_error || {})).map(([wid, oid]) => ({
        workflow: workflows[wid].key,
        operation: operations[oid].key
      }))
    },
    payload: doc.payload,
    is_root: doc.is_root || false,
    input: doc.input,
    output: doc.output,
    redis: doc.redis,
    key: doc.key
  }

  return shouldDump ? yaml.dump(data) : data
}

/**
 * Load the translation config from the firestore document.
 *
 * @param {object} doc - Firestore document.
 * @returns {object} YAML config.
 */
const loadTranslationConf = (doc, shouldDump=true) => {
  const data = {
    type: "Translation",
    key: doc.key,
    lang: doc.lang,
    value: doc.value
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
  // deep config copy
  let cpApp = { ...conf }

  // delete unessesary keys
  delete cpApp.type
  delete cpApp.key

  // attach system key
  cpApp.system_key = conf.key

  // return formatted app
  return cpApp
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
  // deep config copy
  let cpAppAction = { ...conf }

  // delete unessesary keys
  delete cpAppAction.type
  delete cpAppAction.selector
  delete cpAppAction.key

  // attach operation type
  cpAppAction.operation_key = conf.key

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
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadWorkflowDoc = (conf) => {
  // deep config copy
  let coWrf = { ...conf }

  // delete unessesary keys
  delete coWrf.type

  return coWrf
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
const loadOperationDoc = (conf, apps, appActions, workflows) => {
  // define base json operation
  const baseOperation = {
    is_root: conf.is_root,
    workflows: Object.keys(workflows).filter(
      workflowId => conf.selector.workflow.includes(workflows[workflowId].key)
    ),
    app_id: Object.keys(apps).find(key => apps[key].system_key === conf.selector.app),
    payload: conf.payload || {},
    action: {
      id: Object.keys(appActions).find(key =>
        appActions[key].operation_key === conf.selector.app_action
      ),
      type: "app_action"
    },
    redis: conf.redis || {},
    input: conf.input || {},
    output: conf.output || {},
    next_operation: {},
    on_error: {},
    key: conf.key
  }

  // destract next operations and on errors
  const nextOpSelector = (conf.next_operation || {}).selector || []
  const onErrorSelector = (conf.on_error || {}).selector || []

  // attach next operation
  nextOpSelector.forEach(select => {
    // find workflow id by key
    const workflowId = Object.keys(workflows || {}).find(
      workflowId => workflows[workflowId].key === select.workflow
    )

    if (workflowId) {
      // set next operation by workflow id
      baseOperation.next_operation[workflowId] = select.operation
    } else {
      throw new Error(`You try to upload a operation with unknown workflow with key = ${select.workflow}. please make sure you upload also the workflow that belongs to this operation.`)
    }
  })

  // attach on error
  onErrorSelector.forEach(select => {
    // find workflow id by key
    const workflowId = Object.keys(workflows || {}).find(
      workflowId => workflows[workflowId].key === select.workflow
    )

    if (workflowId) {
      // set on error by workflow id
      baseOperation.on_error[workflowId] = select.operation
    } else {
      throw new Error(`You try to upload a operation with unknown workflow with key = ${select.workflow}. please make sure you upload also the workflow that belongs to this operation.`)
    }
  })

  // error handling
  if (!baseOperation.app_id) {
    throw new Error(`unable to find related app with system key = ${conf.selector.app}`)
  }

  if (!baseOperation.action.id) {
    throw new Error(`unable to find related app action with operation key = ${conf.selector.app_action}`)
  }

  // return formatted operation
  return baseOperation
}

/**
 * Converts the given YAML config to the matchinf firestore
 * document.
 *
 * @param {object} conf - YAML config.
 * @returns {object} - Firestore document.
 */
const loadTranslationDoc = (conf) => {
  // deep config copy
  let coTrns = { ...conf }

  // delete unessesary keys
  delete coTrns.type

  return coTrns
}
