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
