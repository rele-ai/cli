const KEYS_MAP = {
  app_actions: "operation_key",
  apps: "system_key",
  operations: "key",
  translations: "key",
  versions: "key",
  workflows: "key"
}

/**
* Converts string to snake case.
*
* @param {string} str - Camel case string.
* @returns {string} - As snake case
*/
module.exports.toSnakeCase = (str) => {
  return str.replace(
    /(?:^|\.?)([A-Z])/g,
    (x,y) => "_" + y.toLowerCase()
  ).replace(/^_/, "")
}

/**
 * Converts list of objects to map.
 *
 * @param {Array.<object>} docs - List of firestore objects.
 * @returns {object} - Mapped data.
 */
module.exports.docListToObj = (docs) => {
  let data = {}

  // map data
  docs.forEach((doc) => {
    data[doc.id] = doc
  })

  return data
}

/**
 * Sort array of configurations by types
 * according to importance.
 * 1. app, workflow, translation
 * 2. app_action
 * 3. operation
 *
 * @param {Array.<object>} data - configs as array of objects
 * @param {Array.<object>} - sorted by types
 */
module.exports.sortByTypes = (data) => {
  const orders = {
    App: 0,
    Workflow: 1,
    Translation: 2,
    AppAction: 3,
    Operation: 4
  }

  return data.sort(
    (a,b) => (orders[a.type] > orders[b.type]) ? 1 : ((orders[b.type] > orders[a.type]) ? -1 : 0)
  )
}

/**
 * Defines the configuration array into two stages.
 * The first stage to resolve is the stage on which nothing depends, followed by the second stage} data
 *
 * @param {Array.<object>} data - configs array
 * @returns {Array.<Array.<Object>>} - matrix of two stages
 */
module.exports.stagesByTypes = (data) => {
  // define stages
  let firstStage = [], secondStage = [], thirdStage = []

  // first stage identifier
  const firstStageIdentifiers = ["App", "Workflow", "Translation"]

  // second stage identifier
  const secondStageIdentifiers = ["AppAction"]

  // add to stages
  data.forEach(object => {
    if (firstStageIdentifiers.includes(object.type)) {
      firstStage.push(object)
    } else if (secondStageIdentifiers.includes(object.type)) {
      secondStage.push(object)
    } else {
      thirdStage.push(object)
    }
  })

  // return stages
  return [firstStage, secondStage, thirdStage]
}

/**
 * loadConfNextOperations recursively loop over
 * the object and formats each instance of next operation
 * or on error to conf format.
 *
 * @param {object} data - base data object before format
 * @param {object} workflows - all workflows
 * @param {object} operations - all operations
 */
module.exports.loadConfNextOperations = (data, workflows, operations) => {
  Object.keys(data).forEach(key => {
    // check if recursion reaches next operation
    // or on error instances and format it
    if (key === "next_operation" || key === "on_error") {
      // take deep copy of next operation
      const nextOp = { ...(data[key] || {}) }

      // reset next operations
      data[key] = {}

      // add next operation
      data[key].selector = Object.entries(nextOp).map(([wid, oid]) => {
        return {
          workflow: workflows[wid].key,
          operation: operations[oid].key
        }
      })
    }

    // go nested
    if (typeof data[key] === "object") {
      this.loadConfNextOperations(data[key], workflows, operations)
    }
  })
}

/**
 * loadDocNextOperations recursively loop over
 * the object and formats each instance of next operation
 * or on error to doc format.
 *
 * @param {object} data - base data object before format
 * @param {object} workflows - all workflows
 */
module.exports.loadDocNextOperations = (data, workflows) => {
  Object.keys(data).forEach(key => {
    // check if recursion reaches next operation
    // or on error instances and format it
    if (key === "next" || key === "on_error") {
      // destract next operations and on errors
      const nextOpSelector = (data[key] || {}).selector || []

      // reset next operation
      data[key] = {}

      // attach next operation
      nextOpSelector.forEach(select => {
        // find workflow id by key
        const workflowId = Object.keys(workflows || {}).find(
          workflowId => workflows[workflowId].key === select.data.workflow
        )

        if (workflowId) {
          // set next operation by workflow id
          data[key].type = select.type
          data[key].data = {
            [workflowId]: select.data.next
          }
        } else {
          throw new Error(`You try to upload a operation with unknown workflow with key = ${select.data.workflow}. please make sure you upload also the workflow that belongs to this operation.`)
        }
      })
    }

    // go nested
    if (typeof data[key] === "object") {
      this.loadDocNextOperations(data[key], workflows)
    }
  })
}

/**
 * Generate RB tag with a predefined structure.
 *
 * @param {string} version - Version tag.
 */
module.exports.generateRbTag = (version) => {
  return `rb-${version}`
}

/**
 * Returns a matrix of grouped items.
 *
 * @param {string} type - Config type
 * @param {Array.<object>} items - List of configs
 */
module.exports.groupByVersion = (type, items) => {
  let groups = {}

  for (const item of items) {
    const key = `${item[KEYS_MAP[type]]}__${item.version}`

    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(item)
  }

  return Object.values(groups)
}
