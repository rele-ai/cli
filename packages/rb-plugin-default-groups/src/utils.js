/**
 * Check if filter is correct.
 *
 * @param {Array.<string>} filter - Filter data.
 * @returns {boolean}
 */
module.exports.checkFilter = ([a, condition, b]) => {
    switch (condition) {
        case "==":
            return a === b
        case "!=":
            return a !== b
        default:
            throw new Error("unexpected condition")
    }
}

/**
 * Converts a list of configs to map by key.
 *
 * @param {Array.<object>} configs - List of configs.
 */
module.exports.configAsMapByKey = (configs) => {
    const configMap = {}

    for (const config of configs) {
        for (const workflowKey of config.selector.workflow) {
            if (!configMap[workflowKey]) {
                configMap[workflowKey] = {}
            }

            configMap[workflowKey][config.key] = config
        }
    }

    return configMap
}

/**
 * Collect all operations to group by __rb_internal.
 *
 * @param {object} config - Root config.
 * @param {object} configMap - Config map of the same type from root config (config.type)
 * @returns {Array.<object>} - Configs to groups.
 */
module.exports.getOperationsToGroup = (config, configMap, operationsToGroup={ data: [] }) => {
    // collect all operations to group
    operationsToGroup.data = [...operationsToGroup.data, config]

    // iterate over next operations
    for (const nextOperation of ((config.next_operation || {}).selector || [])) {
        // console.log("next operation", nextOperation)
        if (nextOperation.operation.startsWith("__rb_internal")) {
            this.getOperationsToGroup(configMap[nextOperation.workflow][nextOperation.operation], configMap, operationsToGroup)
        }
    }

    return operationsToGroup.data
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